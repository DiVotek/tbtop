<?php

namespace Tbtop\Admin\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\Models\MediaFolder;
use Tbtop\Admin\Uploads\UploadUrl;

/**
 * Serialises Media / MediaFolder models to the wire contract shared with the
 * client package. Both toItem() and toFolder() return plain arrays so
 * controllers can json() them directly.
 */
final class MediaResource
{
    /**
     * @return array{id: int, name: string, folderId: int|null, mime: string, size: int, url: string, sizes: array<string, string>, alt: string|null, description: string|null, tags: array<int, string>, createdAt: string}
     */
    public static function toItem(Media $media): array
    {
        $disk = (string) config('tbtop-admin.media.disk', 'public');

        $sizes = [];
        foreach ((is_array($media->sizes) ? $media->sizes : []) as $profile => $storedPath) {
            $sizes[(string) $profile] = UploadUrl::make($disk, $storedPath);
        }

        return [
            'id' => (int) $media->getKey(),
            'name' => (string) $media->name,
            'folderId' => $media->folder_id !== null ? (int) $media->folder_id : null,
            'mime' => (string) $media->mime,
            'size' => (int) $media->size,
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
     * Generate conversion variants for a media file and return the sizes map
     * (profile => path on disk) to persist in the `sizes` column.
     *
     * @param  array<string, array{0: int, 1: int}>  $profiles
     * @return array<string, string>
     */
    public static function generateConversions(
        UploadedFile $file,
        string $storedPath,
        string $disk,
        array $profiles,
    ): array {
        if ($profiles === [] || ! function_exists('imagecreatefromstring')) {
            return [];
        }

        $source = @imagecreatefromstring((string) file_get_contents((string) $file->getRealPath()));
        if ($source === false) {
            return [];
        }

        $result = [];
        foreach ($profiles as $name => [$maxW, $maxH]) {
            $path = self::makeVariant($source, $storedPath, $disk, (string) $name, $maxW, $maxH);
            if ($path !== null) {
                $result[(string) $name] = $path;
            }
        }

        imagedestroy($source);

        return $result;
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

        foreach ((is_array($media->sizes) ? $media->sizes : []) as $variantPath) {
            if ($variantPath !== '') {
                $storage->delete($variantPath);
            }
        }
    }

    private static function makeVariant(
        \GdImage $source,
        string $path,
        string $disk,
        string $name,
        int $maxW,
        int $maxH,
    ): ?string {
        $w = imagesx($source);
        $h = imagesy($source);
        $scale = min($maxW / $w, $maxH / $h, 1.0);
        $newW = max((int) round($w * $scale), 1);
        $newH = max((int) round($h * $scale), 1);

        $resized = imagescale($source, $newW, $newH);
        if ($resized === false) {
            return null;
        }

        ob_start();
        imagepng($resized);
        $blob = (string) ob_get_clean();
        imagedestroy($resized);

        $info = pathinfo($path);
        $variantPath = "{$info['dirname']}/{$info['filename']}-{$name}.png";
        Storage::disk($disk)->put($variantPath, $blob);

        return $variantPath;
    }
}
