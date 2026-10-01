<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;

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
     * Build the badge kind meta from an enum class or a value-keyed map. A map
     * entry is a descriptor ['label' => ?, 'color' => ?] (both optional, [] is
     * a no-op) or — deprecated, removed in 1.0 — a bare Color|string color.
     * Both maps ship as JSON objects (a 0/1-keyed PHP array would encode as a
     * list); labels ship only when some entry has one.
     *
     * @param  array<array-key, mixed>|string  $map  value → descriptor|Color|string, or an enum class-string
     * @return array{colors: object, labels?: object}
     */
    public static function badgeMeta(array|string $map): array
    {
        $entries = is_string($map) ? EnumOptions::badgeEntries($map) : self::badgeEntries($map);
        $colors = [];
        $labels = [];
        foreach ($entries as $value => $entry) {
            if (isset($entry['color'])) {
                $colors[$value] = $entry['color'];
            }
            if (isset($entry['label'])) {
                $labels[$value] = $entry['label'];
            }
        }

        return $labels === []
            ? ['colors' => (object) $colors]
            : ['colors' => (object) $colors, 'labels' => (object) $labels];
    }

    /**
     * Parse an inline map into {label?, color?} entries, raising one
     * deprecation per call when any entry uses the color-only format.
     *
     * @param  array<array-key, mixed>  $map
     * @return array<array-key, array{label?: string, color?: string}>
     */
    private static function badgeEntries(array $map): array
    {
        $entries = [];
        $oldEntry = null;
        foreach ($map as $value => $entry) {
            if ($entry instanceof Color || is_string($entry)) {
                $oldEntry ??= ["'{$value}'", $entry instanceof Color ? 'Color::'.$entry->name : "'{$entry}'"];
                $entries[$value] = ['color' => self::coerceColor($entry)];

                continue;
            }
            if (! is_array($entry)) {
                throw new InvalidArgumentException(sprintf(
                    'badge(): the entry for value "%s" must be a descriptor array or Color|string, got %s.',
                    $value,
                    get_debug_type($entry),
                ));
            }
            $entries[$value] = self::descriptor((string) $value, $entry);
        }
        if ($oldEntry !== null) {
            self::deprecateColorOnly(...$oldEntry);
        }

        return $entries;
    }

    /** One E_USER_DEPRECATED per badge() call, showing the first old entry rewritten. */
    private static function deprecateColorOnly(string $key, string $color): void
    {
        trigger_error(
            "badge(): the color-only map format is deprecated and will be removed in 1.0. Write [{$key} => ['color' => {$color}]] instead of [{$key} => {$color}].",
            E_USER_DEPRECATED,
        );
    }

    /**
     * @param  array<array-key, mixed>  $entry
     * @return array{label?: string, color?: string}
     */
    private static function descriptor(string $value, array $entry): array
    {
        $out = [];
        foreach ($entry as $key => $item) {
            if ($key !== 'label' && $key !== 'color') {
                throw new InvalidArgumentException("badge(): unknown key \"{$key}\" in the entry for value \"{$value}\"; use 'label' and/or 'color'.");
            }
            if ($item === null) {
                continue;
            }
            if ($key === 'label' && (! is_string($item) || $item === '')) {
                throw new InvalidArgumentException("badge(): 'label' for value \"{$value}\" must be a non-empty string.");
            }
            if ($key === 'color' && ! ($item instanceof Color || is_string($item))) {
                throw new InvalidArgumentException("badge(): 'color' for value \"{$value}\" must be Color|string.");
            }
            $out[$key] = $key === 'color' ? self::coerceColor($item) : $item;
        }

        return $out;
    }

    /** Coerce a Color enum to its wire string; pass a plain string through. */
    private static function coerceColor(Color|string $color): string
    {
        return $color instanceof Color ? $color->value : $color;
    }
}
