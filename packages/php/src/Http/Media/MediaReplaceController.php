<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\MediaUploadLimit;
use Tbtop\Admin\Media\MimePolicy;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\SvgSanitizeException;
use Tbtop\Admin\Media\SvgSanitizer;

final class MediaReplaceController
{
    public function __invoke(Request $request, int $id): JsonResponse
    {
        $media = Media::findOrFail($id);

        $config = $this->mediaConfig();
        $accept = (array) ($config['accept'] ?? []);

        $request->validate([
            'file' => 'required|file|max:'.MediaUploadLimit::kilobytes(),
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');

        $this->assertMime($file, $accept);

        $disk = (string) ($config['disk'] ?? 'public');
        $dir = 'tbtop-media';
        $path = $file->store($dir, $disk);
        if ($path === false) {
            abort(500, 'Upload failed.');
        }

        try {
            SvgSanitizer::sanitizeStored($disk, $path, $file->getClientOriginalName());
        } catch (SvgSanitizeException $e) {
            abort(422, __('tbtop-admin::admin.media.errors.'.$e->reason));
        }

        /** @var array<string, array{0: int, 1: int}> $profiles */
        $profiles = (array) ($config['profiles'] ?? []);
        $sizes = MediaResource::generateConversions($file, $path, $disk, $profiles);

        // Old file and its conversions are removed only once the new upload
        // has been stored and sanitized — deleting them earlier would leave
        // $media->path pointing at nothing if sanitization then rejects the
        // replacement. deleteFiles() reads $media->path, so this must run
        // before update() overwrites it.
        MediaResource::deleteFiles($media);

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
        if (! MimePolicy::allows((string) $file->getMimeType(), $accept)) {
            abort(422, __('tbtop-admin::admin.media.errors.mime_not_allowed'));
        }
    }
}
