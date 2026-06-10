<?php

namespace Tbtop\Admin\Uploads;

use Illuminate\Support\Facades\Storage;

final class UploadUrl
{
    /**
     * Same-origin urls become path-relative so stored links survive
     * host/port changes; external disks (s3) stay absolute.
     */
    public static function make(string $disk, string $path): string
    {
        $url = Storage::disk($disk)->url($path);
        $appUrl = rtrim((string) config('app.url'), '/');
        if ($appUrl !== '' && str_starts_with($url, $appUrl.'/')) {
            return substr($url, strlen($appUrl));
        }

        return $url;
    }
}
