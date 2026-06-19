<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\SvgSanitizer;

final class MediaReplaceController
{
    public function __invoke(Request $request, int $id): JsonResponse
    {
        $media = Media::findOrFail($id);

        $config = $this->mediaConfig();
        $maxKb = (int) ($config['max_size'] ?? 10240);
        $accept = (array) ($config['accept'] ?? []);

        $request->validate([
            'file' => "required|file|max:{$maxKb}",
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');

        $this->assertMime($file, $accept);

        // Delete old file and all conversions before writing the new one.
        MediaResource::deleteFiles($media);

        $disk = (string) ($config['disk'] ?? 'public');
        $dir = 'tbtop-media';
        $path = $file->store($dir, $disk);
        if ($path === false) {
            abort(500, 'Upload failed.');
        }

        SvgSanitizer::sanitizeStored($disk, $path, $file->getClientOriginalName());

        /** @var array<string, array{0: int, 1: int}> $profiles */
        $profiles = (array) ($config['profiles'] ?? []);
        $sizes = MediaResource::generateConversions($file, $path, $disk, $profiles);

        $media->update([
            'name' => $file->getClientOriginalName(),
            'disk' => $disk,
            'path' => $path,
            'mime' => (string) $file->getMimeType(),
            'size' => (int) $file->getSize(),
            'sizes' => $sizes,
        ]);

        return response()->json(MediaResource::toItem($media->refresh()));
    }

    /** @return array<string, mixed> */
    private function mediaConfig(): array
    {
        $cfg = config('tbtop-admin.media');

        return is_array($cfg) ? $cfg : [];
    }

    /** @param list<string> $accept */
    private function assertMime(UploadedFile $file, array $accept): void
    {
        $mime = (string) $file->getMimeType();

        // text/html is active content (the SVG-as-html XSS vector). Refuse it
        // even when the accept list allows text/* — it is never a media file.
        if (str_starts_with($mime, 'text/html')) {
            abort(422, __('tbtop-admin::admin.media.errors.mime_not_allowed'));
        }

        if ($accept === []) {
            return;
        }

        foreach ($accept as $pattern) {
            if (fnmatch((string) $pattern, $mime)) {
                return;
            }
        }

        abort(422, __('tbtop-admin::admin.media.errors.mime_not_allowed'));
    }
}
