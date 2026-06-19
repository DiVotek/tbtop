<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Http\UploadedFile;

/** Encodes a GD image to a target format, gated by GD capability. */
final class ImageEncoder
{
    /** @var array<string, array{fn: string, mimeType: string, ext: string, quality: int|null}> */
    private const FORMATS = [
        'webp' => ['fn' => 'imagewebp', 'mimeType' => 'image/webp', 'ext' => 'webp', 'quality' => 80],
        'jpeg' => ['fn' => 'imagejpeg', 'mimeType' => 'image/jpeg', 'ext' => 'jpg', 'quality' => 82],
        'png' => ['fn' => 'imagepng', 'mimeType' => 'image/png', 'ext' => 'png', 'quality' => null],
    ];

    /** True when GD can encode this target format. */
    public static function supports(string $format): bool
    {
        $spec = self::FORMATS[$format] ?? null;

        return $spec !== null && function_exists($spec['fn']);
    }

    /**
     * Encode a GD image to the target format.
     * Returns null when the format is unsupported (caller keeps the original).
     *
     * @return array{blob: string, mimeType: string, ext: string}|null
     */
    public static function encode(\GdImage $img, string $format, ?int $quality = null): ?array
    {
        if (! self::supports($format)) {
            return null;
        }
        $spec = self::FORMATS[$format];
        $blob = self::capture($img, $spec['fn'], $quality ?? $spec['quality']);

        return ['blob' => $blob, 'mimeType' => $spec['mimeType'], 'ext' => $spec['ext']];
    }

    /** Decode an uploaded file to a GD image, or null if not a decodable image. */
    public static function fromUpload(UploadedFile $file): ?\GdImage
    {
        $img = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));

        return $img === false ? null : $img;
    }

    /** Buffers a GD writer; png ignores the quality argument. */
    private static function capture(\GdImage $img, string $writer, ?int $quality): string
    {
        ob_start();
        $quality === null ? $writer($img) : $writer($img, null, $quality);

        return (string) ob_get_clean();
    }
}
