<?php

namespace Tbtop\Admin\Dsl;

final class Meta
{
    private const KEYS = ['id', 'hidden', 'disabled', 'hiddenIf', 'disabledIf'];

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return self::KEYS;
    }

    /**
     * Mirrors the client grammar: id/hidden/disabled live in meta.
     *
     * @param  array<string, mixed>  $input
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    public static function split(array $input): array
    {
        $options = [];
        $meta = [];
        foreach ($input as $key => $value) {
            if (in_array($key, self::KEYS, true)) {
                $meta[$key] = $value;
            } else {
                $options[$key] = $value;
            }
        }

        return [$options, $meta];
    }
}
