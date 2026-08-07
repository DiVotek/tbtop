<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\MediaUploadLimit;
use Tbtop\Admin\Media\MimePolicy;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\SvgSanitizer;

final class MediaUploadController
{
    public function __invoke(Request $request): JsonResponse
    {
        $config = $this->mediaConfig();
        $accept = (array) ($config['accept'] ?? []);

        $request->validate([
            'file' => 'required|file|max:'.MediaUploadLimit::kilobytes(),
            'folderId' => 'nullable|integer|exists:tbtop_media_folders,id',
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

        SvgSanitizer::sanitizeStored($disk, $path, $file->getClientOriginalName());

        /** @var array<string, array{0: int, 1: int}> $profiles */
        $profiles = (array) ($config['profiles'] ?? []);
        $sizes = MediaResource::generateConversions($file, $path, $disk, $profiles);

        $media = Media::create([
            'folder_id' => $request->input('folderId') !== null ? (int) $request->input('folderId') : null,
            'name' => $file->getClientOriginalName(),
            'disk' => $disk,
            'path' => $path,
            'mime' => (string) $file->getMimeType(),
            'size' => (int) $file->getSize(),
            'sizes' => $sizes,
            'alt' => null,
        ]);

        return response()->json(MediaResource::toItem($media), 201);
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
