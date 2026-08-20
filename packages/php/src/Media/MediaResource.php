<?php

namespace Tbtop\Admin\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\Models\MediaFolder;
use Tbtop\Admin\Uploads\ImageSizes;
use Tbtop\Admin\Uploads\UploadUrl;

/**
 * Serialises Media / MediaFolder models to the wire contract shared with the
 * client package. Both toItem() and toFolder() return plain arrays so
 * controllers can json() them directly.
 *
 * @phpstan-import-type Variant from ImageSizes
 */
final class MediaResource
{
    /**
     * @return array{id: int, name: string, folderId: int|null, mime: string, size: int, width: int|null, height: int|null, url: string, sizes: array<string, array{url: string, width: int, height: int, mime: string}>, alt: string|null, description: string|null, tags: array<int, string>, createdAt: string}
     */
    public static function toItem(Media $media): array
    {
        $disk = (string) config('tbtop-admin.media.disk', 'public');

        $sizes = [];
        foreach ($media->sizes ?? [] as $profile => $variant) {
            $sizes[(string) $profile] = [
                'url' => UploadUrl::make($disk, $variant['path']),
                'width' => (int) $variant['width'],
                'height' => (int) $variant['height'],
                'mime' => (string) $variant['mime'],
            ];
        }

        return [
            'id' => (int) $media->getKey(),
            'name' => (string) $media->name,
            'folderId' => $media->folder_id !== null ? (int) $media->folder_id : null,
            'mime' => (string) $media->mime,
            'size' => (int) $media->size,
            'width' => $media->width !== null ? (int) $media->width : null,
            'height' => $media->height !== null ? (int) $media->height : null,
            'url' => UploadUrl::make($disk, (string) $media->path),
            'sizes' => $sizes,
            'alt' => $media->alt !== null ? (string) $media->alt : null,
            'description' => $media->description !== null ? (string) $media->description : null,
            'tags' => is_array($media->tags) ? $media->tags : [],
            'createdAt' => $media->created_at?->toIso8601String() ?? '',
        ];
    }

    /**
     * @return array{id: int, name: string, parentId: int|null}
     */
    public static function toFolder(MediaFolder $folder): array
    {
        return [
            'id' => (int) $folder->getKey(),
            'name' => (string) $folder->name,
            'parentId' => $folder->parent_id !== null ? (int) $folder->parent_id : null,
        ];
    }

    /**
     * Image-derived model attributes for a stored upload: original dimensions
     * (null for non-images) and the conversion variants for the given profiles.
     *
     * @param  array<string, array{0: int, 1: int}>  $profiles
     * @return array{width: int|null, height: int|null, sizes: array<string, Variant>}
     */
    public static function imageAttributes(
        UploadedFile $file,
        string $storedPath,
        string $disk,
        array $profiles,
    ): array {
        [$width, $height] = ImageSizes::dimensions($file);

        return [
            'width' => $width,
            'height' => $height,
            'sizes' => ImageSizes::generate($file, $storedPath, $disk, $profiles),
        ];
    }

    /**
     * Delete the original file and all conversion variants from disk.
     */
    public static function deleteFiles(Media $media): void
    {
        $disk = (string) config('tbtop-admin.media.disk', 'public');
        $storage = Storage::disk($disk);

        if ($media->path !== '') {
            $storage->delete($media->path);
        }

        foreach ($media->sizes ?? [] as $variant) {
            if ($variant['path'] !== '') {
                $storage->delete($variant['path']);
            }
        }
    }
}
