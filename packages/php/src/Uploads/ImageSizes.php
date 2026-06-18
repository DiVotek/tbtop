<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

final class ImageSizes
{
    /** @return array{0: int|null, 1: int|null} */
    public static function dimensions(UploadedFile $file): array
    {
        $info = @getimagesize($file->getRealPath());

        return $info === false ? [null, null] : [$info[0], $info[1]];
    }

    /**
     * Generates resized variants (fit: inside) next to the original.
     * Non-images and missing GD degrade to no variants.
     * Format defaults to png; unsupported formats fall back to png per variant.
     *
     * @param  array<string, array{0: int, 1: int}>  $sizes
     * @return list<array<string, mixed>>
     */
    public static function generate(
        UploadedFile $file,
        string $path,
        string $disk,
        array $sizes,
        ?string $format = null,
        ?int $quality = null,
    ): array {
        if ($sizes === [] || ! function_exists('imagecreatefromstring')) {
            return [];
        }
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if ($source === false) {
            return [];
        }

        $fmt = $format ?? 'png';
        $out = [];
        foreach ($sizes as $name => [$maxW, $maxH]) {
            $variant = self::variant($source, $path, $disk, (string) $name, $maxW, $maxH, $fmt, $quality);
            if ($variant !== null) {
                $out[] = $variant;
            }
        }
        imagedestroy($source);

        return $out;
    }

    /** @return array<string, mixed>|null */
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

        return [
            'name' => $name,
            'filename' => basename($variantPath),
            'url' => UploadUrl::make($disk, $variantPath),
            'width' => $newW,
            'height' => $newH,
            'mimeType' => $enc['mimeType'],
            'filesize' => strlen($enc['blob']),
        ];
    }
}
