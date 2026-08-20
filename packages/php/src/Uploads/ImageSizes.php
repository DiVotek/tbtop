<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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
     * Generates resized variants (fit: inside) next to the original, keyed by
     * profile name. Non-images and missing GD degrade to no variants.
     * Unsupported formats fall back to png per variant.
     *
     * @param  array<string, array{0: int, 1: int}>  $profiles
     * @return array<string, Variant>
     */
    public static function generate(
        UploadedFile $file,
        string $path,
        string $disk,
        array $profiles,
        string $format = 'png',
        ?int $quality = null,
    ): array {
        if ($profiles === [] || ! function_exists('imagecreatefromstring')) {
            return [];
        }
        $source = ImageEncoder::fromUpload($file);
        if ($source === null) {
            return [];
        }

        $out = [];
        foreach ($profiles as $name => [$maxW, $maxH]) {
            $variant = self::variant($source, $path, $disk, (string) $name, $maxW, $maxH, $format, $quality);
            if ($variant !== null) {
                $out[(string) $name] = $variant;
            }
        }
        imagedestroy($source);

        return $out;
    }

    /** @return Variant|null */
    private static function variant(
        \GdImage $source,
        string $path,
        string $disk,
        string $name,
        int $maxW,
        int $maxH,
        string $format,
        ?int $quality,
    ): ?array {
        $w = imagesx($source);
        $h = imagesy($source);
        $scale = min($maxW / $w, $maxH / $h, 1);
        $newW = max((int) round($w * $scale), 1);
        $newH = max((int) round($h * $scale), 1);

        $resized = imagescale($source, $newW, $newH);
        if ($resized === false) {
            return null;
        }
        $enc = ImageEncoder::encode($resized, $format, $quality) ?? ImageEncoder::encode($resized, 'png');
        imagedestroy($resized);
        if ($enc === null) {
            return null;
        }

        $info = pathinfo($path);
        $variantPath = "{$info['dirname']}/{$info['filename']}-{$name}.{$enc['ext']}";
        Storage::disk($disk)->put($variantPath, $enc['blob']);

        return ['path' => $variantPath, 'width' => $newW, 'height' => $newH, 'mime' => $enc['mimeType']];
    }
}
