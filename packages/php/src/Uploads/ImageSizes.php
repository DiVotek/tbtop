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
     *
     * @param  array<string, array{0: int, 1: int}>  $sizes
     * @return list<array<string, mixed>>
     */
    public static function generate(UploadedFile $file, string $path, string $disk, array $sizes): array
    {
        if ($sizes === [] || ! function_exists('imagecreatefromstring')) {
            return [];
        }
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if ($source === false) {
            return [];
        }

        $out = [];
        foreach ($sizes as $name => [$maxW, $maxH]) {
            $variant = self::variant($source, $path, $disk, (string) $name, $maxW, $maxH);
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
        ob_start();
        imagepng($resized);
        $blob = (string) ob_get_clean();
        imagedestroy($resized);

        $info = pathinfo($path);
        $variantPath = "{$info['dirname']}/{$info['filename']}-{$name}.png";
        Storage::disk($disk)->put($variantPath, $blob);

        return [
            'name' => $name,
            'filename' => basename($variantPath),
            'url' => Storage::disk($disk)->url($variantPath),
            'width' => $newW,
            'height' => $newH,
            'mimeType' => 'image/png',
            'filesize' => strlen($blob),
        ];
    }
}
