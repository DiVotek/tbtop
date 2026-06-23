<?php

namespace App\Admin\Pages\Concerns;

use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Uploads\UploadUrl;

/**
 * Media column derivation shared by the media create/edit forms.
 * Both pages turn a stored upload path into the persisted media columns.
 */
trait MediaFormFields
{
    /**
     * Derive media columns from a stored upload path. Dimensions come from the
     * file bytes; resized variants are unrecoverable from a bare path, so [].
     *
     * @return array<string, mixed>
     */
    protected static function columnsFromPath(string $path): array
    {
        $disk = (string) (config('tbtop-admin.uploads')['media']['disk'] ?? 'public');
        [$width, $height] = self::dimensions($disk, $path);

        return [
            'filename' => basename($path),
            'url' => UploadUrl::make($disk, $path),
            'mime_type' => Storage::disk($disk)->mimeType($path),
            'filesize' => Storage::disk($disk)->size($path),
            'width' => $width,
            'height' => $height,
            'sizes' => [],
        ];
    }

    /**
     * Read pixel dimensions from the stored file bytes.
     *
     * @return array{0: int|null, 1: int|null}
     */
    protected static function dimensions(string $disk, string $path): array
    {
        $info = @getimagesizefromstring(Storage::disk($disk)->get($path));

        return $info === false ? [null, null] : [$info[0], $info[1]];
    }
}
