<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Uploads\UploadUrl;

class Media extends Model
{
    protected $table = 'media';

    protected $guarded = [];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'filesize' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'sizes' => 'array',
        ];
    }

    /**
     * Read the metadata we used to carry through the upload envelope directly
     * from the stored file on disk. Called from upload form submit handlers.
     *
     * @return array<string, mixed>
     */
    public static function metadataFromPath(string $path, string $disk = 'public'): array
    {
        $storage = Storage::disk($disk);
        $fullPath = $storage->path($path);
        [$width, $height] = @getimagesize($fullPath) ?: [null, null];

        return [
            'path' => $path,
            'filename' => basename($path),
            'url' => UploadUrl::make($disk, $path),
            'mime_type' => $storage->mimeType($path),
            'filesize' => $storage->size($path),
            'width' => $width,
            'height' => $height,
            'sizes' => [],
        ];
    }
}
