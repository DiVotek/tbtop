<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\SvgSanitizeException;
use Tbtop\Admin\Media\SvgSanitizer;
use Tbtop\Admin\Media\UrlFetcher;
use Tbtop\Admin\Media\UrlFetchException;

final class MediaImportController
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'url' => 'required|string',
            'name' => 'nullable|string|max:255',
            'folderId' => 'nullable|integer|exists:tbtop_media_folders,id',
        ]);

        $url = (string) $request->input('url');
        $config = $this->mediaConfig();

        /** @var list<string> $accept */
        $accept = (array) ($config['accept'] ?? []);

        try {
            $file = UrlFetcher::fetch($url, $accept);
        } catch (UrlFetchException $e) {
            return $this->error422('media.errors.'.$e->reason);
        }

        $tmpPath = $file->getPathname();

        try {
            $disk = (string) ($config['disk'] ?? 'public');
            $filename = $file->getClientOriginalName();
            $detectedMime = (string) $file->getMimeType();
            $size = (int) filesize($tmpPath);

            $path = $file->store('tbtop-media', $disk);
            if ($path === false) {
                return $this->error422('media.errors.download_failed');
            }

            try {
                SvgSanitizer::sanitizeStored($disk, $path, $filename);
            } catch (SvgSanitizeException $e) {
                return $this->error422('media.errors.'.$e->reason);
            }

            /** @var array<string, array{0: int, 1: int}> $profiles */
            $profiles = (array) ($config['profiles'] ?? []);
            $image = MediaResource::imageAttributes($file, $path, $disk, $profiles);

            $customName = $request->input('name');
            $name = (is_string($customName) && $customName !== '') ? $customName : $filename;

            $media = Media::create([
                'folder_id' => $request->input('folderId') !== null ? (int) $request->input('folderId') : null,
                'name' => $name,
                'disk' => $disk,
                'path' => $path,
                'mime' => $detectedMime,
                'size' => $size,
                ...$image,
                'alt' => null,
            ]);

            return response()->json(MediaResource::toItem($media), 201);
        } finally {
            @unlink($tmpPath);
        }
    }

    /** @return array<string, mixed> */
    private function mediaConfig(): array
    {
        $cfg = config('tbtop-admin.media');

        return is_array($cfg) ? $cfg : [];
    }

    private function error422(string $langKey): JsonResponse
    {
        return response()->json(
            ['message' => __('tbtop-admin::admin.'.$langKey)],
            422,
        );
    }
}
