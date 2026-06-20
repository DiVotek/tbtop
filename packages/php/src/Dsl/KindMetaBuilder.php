<?php

namespace Tbtop\Admin\Dsl;

/**
 * Shared client-render meta for the boolean / badge kinds, used by both Column
 * and DisplayValueBlock. Only the meta-shape and Color coercion live here;
 * each caller keeps its own fluent style (Column mutates, the block clones).
 *
 * Mirrors KindFormat on the format side — pure static helpers, no state.
 */
final class KindMetaBuilder
{
    /**
     * Build the boolean kind meta from icon/color params. Returns [] when no
     * param was set, so the caller can skip emitting an empty boolean key.
     *
     * @return array<string, string>
     */
    public static function booleanMeta(
        ?string $trueIcon,
        ?string $falseIcon,
        Color|string|null $trueColor,
        Color|string|null $falseColor,
    ): array {
        $meta = [];
        if ($trueIcon !== null) {
            $meta['trueIcon'] = $trueIcon;
        }
        if ($falseIcon !== null) {
            $meta['falseIcon'] = $falseIcon;
        }
        if ($trueColor !== null) {
            $meta['trueColor'] = self::coerceColor($trueColor);
        }
        if ($falseColor !== null) {
            $meta['falseColor'] = self::coerceColor($falseColor);
        }

        return $meta;
    }

    /**
     * Build the badge kind meta: each value's Color is coerced to its wire string.
     *
     * @param  array<string, Color|string>  $colors  value → Color|string
     * @return array{colors: array<string, string>}
     */
    public static function badgeMeta(array $colors): array
    {
        $mapped = [];
        foreach ($colors as $value => $color) {
            $mapped[$value] = self::coerceColor($color);
        }

        return ['colors' => $mapped];
    }

    /** Coerce a Color enum to its wire string; pass a plain string through. */
    public static function coerceColor(Color|string $color): string
    {
        return $color instanceof Color ? $color->value : $color;
    }
}
