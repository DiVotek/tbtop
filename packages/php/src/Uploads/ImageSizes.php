<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * @phpstan-type Variant array{path: string, width: int, height: int, mime: string}
 */
final class ImageSizes
{
    /** @return array{0: int|null, 1: int|null} */
    public static function dimensions(UploadedFile $file): array
    {
        $info = @getimagesize((string) $file->getRealPath());

        return $info === false ? [null, null] : [$info[0], $info[1]];
    }

    /**
     * Generates resized variants (fit: inside, never upscaled) next to the
     * original, keyed by profile name. A responsive (width-only) profile is
     * skipped for an image no wider than it. Non-images and missing GD degrade
     * to no variants. A format
     * GD cannot encode falls back to png per variant. If a variant throws, the
     * variants already written are deleted before the exception propagates.
     *
     * @param  array<string, ConversionProfile>  $profiles
     * @return array<string, Variant>
     */
    public static function generate(UploadedFile $file, string $path, string $disk, array $profiles): array
    {
        if ($profiles === [] || ! function_exists('imagecreatefromstring')) {
            return [];
        }
        $source = ImageEncoder::fromUpload($file);

        return $source === null ? [] : self::fromImage($source, $path, $disk, $profiles);
    }

    /**
     * generate() for an already decoded image, such as a stored original being
     * regenerated. Same cleanup on failure.
     *
     * @param  array<string, ConversionProfile>  $profiles
     * @return array<string, Variant>
     */
    public static function fromImage(\GdImage $source, string $path, string $disk, array $profiles): array
    {
        $out = [];
        try {
            foreach ($profiles as $name => $profile) {
                $variant = self::variant($source, $path, $disk, (string) $name, $profile);
                if ($variant !== null) {
                    $out[(string) $name] = $variant;
                }
            }
        } catch (Throwable $e) {
            Storage::disk($disk)->delete(array_column($out, 'path'));

            throw $e;
        }

        return $out;
    }

    /** @return Variant|null */
    private static function variant(
        \GdImage $source,
        string $path,
        string $disk,
        string $name,
        ConversionProfile $profile,
    ): ?array {
        $w = imagesx($source);
        $h = imagesy($source);
        // A responsive variant no narrower than the original adds nothing to a srcset.
        if ($profile->isResponsive() && $w <= $profile->maxWidth) {
            return null;
        }
        $heightScale = $profile->maxHeight === null ? 1 : $profile->maxHeight / $h;
        $scale = min($profile->maxWidth / $w, $heightScale, 1);
        $newW = max((int) round($w * $scale), 1);
        $newH = max((int) round($h * $scale), 1);

        $resized = imagescale($source, $newW, $newH);
        if ($resized === false) {
            return null;
        }
        $enc = ImageEncoder::encode($resized, $profile->format, $profile->quality)
            ?? ImageEncoder::encode($resized, 'png');
        if ($enc === null) {
            return null;
        }

        $info = pathinfo($path);
        $variantPath = "{$info['dirname']}/{$info['filename']}-{$name}.{$enc['ext']}";
        Storage::disk($disk)->put($variantPath, $enc['blob']);

        return ['path' => $variantPath, 'width' => $newW, 'height' => $newH, 'mime' => $enc['mimeType']];
    }
}
