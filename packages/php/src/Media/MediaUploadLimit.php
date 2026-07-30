<?php

namespace Tbtop\Admin\Media;

final class MediaUploadLimit
{
    public const DEFAULT_KILOBYTES = 10 * 1024;

    public static function kilobytes(): int
    {
        // config() only falls back when the key is absent. A published config
        // using env() with no value yields null, which would cast to max:0.
        $configured = config('tbtop-admin.media.max_size');

        return (int) ($configured === null || $configured === '' ? self::DEFAULT_KILOBYTES : $configured);
    }

    public static function bytes(): int
    {
        return self::kilobytes() * 1024;
    }
}
