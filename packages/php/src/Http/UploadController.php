<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Uploads\ImageSizes;
use Tbtop\Admin\Uploads\UploadUrl;

final class UploadController
{
    public function __invoke(Request $request): JsonResponse
    {
        $profile = $this->profile((string) $request->route('tbtopProfile'));
        $maxKb = (int) (($profile['maxSize'] ?? 5 * 1024 * 1024) / 1024);
        $request->validate(['file' => "required|file|max:{$maxKb}"]);

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $this->assertMime($file, $profile);

        $disk = (string) ($profile['disk'] ?? 'public');
        $dir = (string) ($profile['dir'] ?? 'uploads');
        $path = $file->store($dir, $disk);
        if ($path === false) {
            abort(500, 'Upload failed.');
        }
        [$width, $height] = ImageSizes::dimensions($file);

        return response()->json(['data' => [
            'id' => basename($path),
            'filename' => $file->getClientOriginalName(),
            'mimeType' => (string) $file->getMimeType(),
            'filesize' => $file->getSize(),
            'url' => UploadUrl::make($disk, $path),
            'width' => $width,
            'height' => $height,
            'sizes' => ImageSizes::generate($file, $path, $disk, $profile['sizes'] ?? []),
        ]]);
    }

    /** @return array<string, mixed> */
    private function profile(string $name): array
    {
        $profiles = config('tbtop-admin.uploads', []);
        $profile = is_array($profiles) ? ($profiles[$name] ?? null) : null;
        if (! is_array($profile)) {
            throw new NotFoundHttpException("Unknown upload profile \"{$name}\".");
        }

        return $profile;
    }

    /** @param  array<string, mixed>  $profile */
    private function assertMime(UploadedFile $file, array $profile): void
    {
        $accept = $profile['accept'] ?? [];
        if (! is_array($accept) || $accept === []) {
            return;
        }
        $mime = (string) $file->getMimeType();
        foreach ($accept as $pattern) {
            if (fnmatch((string) $pattern, $mime)) {
                return;
            }
        }
        abort(422, "File type {$mime} is not allowed.");
    }
}
