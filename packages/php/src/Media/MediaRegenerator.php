<?php

namespace Tbtop\Admin\Media;

use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Uploads\ConversionProfile;
use Tbtop\Admin\Uploads\ImageEncoder;
use Tbtop\Admin\Uploads\ImageSizes;

/**
 * Rebuilds conversion variants for a stored Media row from its original,
 * for media uploaded before a profile was added or changed.
 *
 * @phpstan-import-type Variant from ImageSizes
 */
final class MediaRegenerator
{
    /**
     * Writes the variants the row lacks for the given profiles, or all of them
     * with $force, and saves the merged `sizes`. With $force a profile that no
     * longer applies (a responsive one wider than the image) loses its old file,
     * and an old file under another extension is deleted. A row whose original
     * is missing or not a decodable raster image is left untouched.
     *
     * @param  array<string, ConversionProfile>  $profiles
     * @return int the number of variants written
     */
    public static function regenerate(Media $media, array $profiles, bool $force = false): int
    {
        $existing = $media->sizes ?? [];
        $wanted = $force ? $profiles : array_diff_key($profiles, $existing);
        if ($wanted === []) {
            return 0;
        }
        $source = self::decode($media);
        if ($source === null) {
            return 0;
        }

        $written = ImageSizes::fromImage($source, $media->path, $media->disk, $wanted);
        $sizes = array_merge(array_diff_key($existing, $wanted), $written);
        if ($force) {
            self::deleteReplaced($media->disk, array_intersect_key($existing, $wanted), $written);
        }
        $media->sizes = $sizes;
        $media->save();

        return count($written);
    }

    private static function decode(Media $media): ?\GdImage
    {
        if (! function_exists('imagecreatefromstring')) {
            return null;
        }
        $blob = Storage::disk($media->disk)->get($media->path);

        return $blob === null ? null : ImageEncoder::fromBlob($blob);
    }

    /**
     * Deletes old variant files that the regenerated set no longer points at.
     *
     * @param  array<string, Variant>  $old
     * @param  array<string, Variant>  $new
     */
    private static function deleteReplaced(string $disk, array $old, array $new): void
    {
        $kept = array_column($new, 'path');
        $stale = array_values(array_diff(array_column($old, 'path'), $kept));
        if ($stale !== []) {
            Storage::disk($disk)->delete($stale);
        }
    }
}
