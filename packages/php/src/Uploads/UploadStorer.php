<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Persists one upload for a resolved field: store, optional format conversion,
 * visibility, dimensions and resized variants, returning the wire envelope.
 */
final class UploadStorer
{
    /** @return array<string, mixed> */
    public static function store(UploadedFile $file, UploadFieldConfig $config): array
    {
        $path = $file->store($config->directory, $config->disk);
        if ($path === false) {
            abort(500, 'Upload failed.');
        }

        $format = $config->image['convertTo'] ?? null;
        $quality = $config->image['quality'] ?? null;
        [$path, $mimeType] = self::convert($file, $path, $config, $format, $quality);
        self::applyVisibility($config->disk, $path, $config->visibility);

        [$width, $height] = ImageSizes::dimensions($file);
        $sizes = ImageSizes::generate($file, $path, $config->disk, $config->sizes, $format, $quality);

        return [
            'id' => basename($path),
            'path' => $path,
            'filename' => $file->getClientOriginalName(),
            'mimeType' => $mimeType,
            'filesize' => Storage::disk($config->disk)->size($path),
            'url' => UploadUrl::make($config->disk, $path),
            'width' => $width,
            'height' => $height,
            'sizes' => $sizes,
        ];
    }

    /**
     * Re-encodes the stored image when a target format is set and supported.
     * Returns the (possibly new) path and the mime type to report.
     *
     * @return array{0: string, 1: string}
     */
    private static function convert(
        UploadedFile $file,
        string $path,
        UploadFieldConfig $config,
        ?string $format,
        ?int $quality,
    ): array {
        $fallback = [$path, (string) $file->getMimeType()];
        if ($format === null) {
            return $fallback;
        }
        $img = ImageEncoder::fromUpload($file);
        if ($img === null) {
            return $fallback;
        }
        $enc = ImageEncoder::encode($img, $format, $quality);
        imagedestroy($img);
        if ($enc === null) {
            return $fallback;
        }

        return self::swap($config->disk, $path, $enc);
    }

    /**
     * Writes the converted blob beside the original and drops the original.
     *
     * @param  array{blob: string, mimeType: string, ext: string}  $enc
     * @return array{0: string, 1: string}
     */
    private static function swap(string $disk, string $path, array $enc): array
    {
        $info = pathinfo($path);
        $newPath = "{$info['dirname']}/{$info['filename']}.{$enc['ext']}";
        Storage::disk($disk)->put($newPath, $enc['blob']);
        if ($newPath !== $path) {
            Storage::disk($disk)->delete($path);
        }

        return [$newPath, $enc['mimeType']];
    }

    /** Best-effort private visibility; a driver that lacks it must not fail the upload. */
    private static function applyVisibility(string $disk, string $path, string $visibility): void
    {
        if ($visibility !== 'private') {
            return;
        }
        try {
            Storage::disk($disk)->setVisibility($path, 'private');
        } catch (Throwable) {
            // Driver does not support per-file visibility; keep the stored file.
        }
    }
}
