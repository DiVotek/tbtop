<?php

namespace Tbtop\Admin\Media;

final class MediaUploadLimit
{
    public const DEFAULT_KILOBYTES = 10 * 1024;

    public static function kilobytes(): int
    {
        return (int) config('tbtop-admin.media.max_size', self::DEFAULT_KILOBYTES);
    }

    public static function bytes(): int
    {
        return self::kilobytes() * 1024;
    }
}
