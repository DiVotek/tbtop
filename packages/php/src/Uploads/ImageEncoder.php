<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Http\UploadedFile;

/** Encodes a GD image to a target format, gated by GD capability. */
final class ImageEncoder
{
    /** Decode ceiling; larger images stay unconverted (decompression-bomb guard, CWE-409). */
    private const MAX_DECODE_PIXELS = 40_000_000;

    /** @var array<string, array{fn: string, mimeType: string, ext: string, quality: int|null}> */
    private const FORMATS = [
        'webp' => ['fn' => 'imagewebp', 'mimeType' => 'image/webp', 'ext' => 'webp', 'quality' => 80],
        'jpeg' => ['fn' => 'imagejpeg', 'mimeType' => 'image/jpeg', 'ext' => 'jpg', 'quality' => 82],
        'png' => ['fn' => 'imagepng', 'mimeType' => 'image/png', 'ext' => 'png', 'quality' => null],
    ];

    /** True for a format this encoder knows, regardless of GD support. */
    public static function isKnownFormat(string $format): bool
    {
        return isset(self::FORMATS[$format]);
    }

    /** True when GD can encode this target format. */
    public static function supports(string $format): bool
    {
        $spec = self::FORMATS[$format] ?? null;

        return $spec !== null && function_exists($spec['fn']);
    }

    /**
     * Encode a GD image to the target format.
     * Returns null when the format is unsupported (caller keeps the original).
     * A palette image is promoted to truecolor in place for every target but
     * png: GD's webp writer rejects palette images outright.
     *
     * @return array{blob: string, mimeType: string, ext: string}|null
     */
    public static function encode(\GdImage $img, string $format, ?int $quality = null): ?array
    {
        if (! self::supports($format)) {
            return null;
        }
        $spec = self::FORMATS[$format];
        if ($format !== 'png' && ! imageistruecolor($img) && ! imagepalettetotruecolor($img)) {
            return null;
        }
        $blob = self::capture($img, $spec['fn'], $quality ?? $spec['quality']);
        if ($blob === null) {
            return null;
        }

        return ['blob' => $blob, 'mimeType' => $spec['mimeType'], 'ext' => $spec['ext']];
    }

    /** Decode an uploaded file to a GD image, or null if its size is unreadable, above the pixel cap, or not decodable. */
    public static function fromUpload(UploadedFile $file): ?\GdImage
    {
        return self::fromBlob((string) file_get_contents((string) $file->getRealPath()));
    }

    /** Decode image bytes (a stored original) to a GD image, under the same rules as fromUpload(). */
    public static function fromBlob(string $blob): ?\GdImage
    {
        $info = $blob === '' ? false : @getimagesizefromstring($blob);
        if ($info === false || $info[0] * $info[1] > self::MAX_DECODE_PIXELS) {
            return null;
        }
        $img = @imagecreatefromstring($blob);

        return $img === false ? null : $img;
    }

    /** Buffers a GD writer; png ignores the quality argument. */
    private static function capture(\GdImage $img, string $writer, ?int $quality): ?string
    {
        ob_start();
        $written = $quality === null ? $writer($img) : $writer($img, null, $quality);
        $blob = (string) ob_get_clean();

        return $written && $blob !== '' ? $blob : null;
    }
}
