<?php

namespace Tbtop\Admin\Dsl;

use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Wire contract: translatable record values are locale maps. Rows written
 * before a field became translatable carry plain scalars — left as-is the
 * client round-trips them and validation rejects ("must be an array").
 */
final class TranslatableRecord
{
    /**
     * @param  array<string, mixed>  $record
     * @param  list<mixed>  $children
     * @return array<string, mixed>
     */
    public static function normalize(array $record, array $children): array
    {
        foreach (self::translatableNames($children) as $name) {
            if (! array_key_exists($name, $record)) {
                continue;
            }
            $value = $record[$name];
            if (is_array($value) || $value === null) {
                continue;
            }
            $record[$name] = self::toLocaleMap($value);
        }

        return $record;
    }

    /** @param  list<mixed>  $children @return list<string> */
    private static function translatableNames(array $children): array
    {
        $names = [];
        foreach ($children as $child) {
            if ($child instanceof Field && $child->isTranslatableField()) {
                $names[] = $child->name;
            } elseif ($child instanceof Node) {
                $nested = $child->options['children'] ?? [];
                if (is_array($nested)) {
                    $names = [...$names, ...self::translatableNames(array_values($nested))];
                }
            }
        }

        return $names;
    }

    /** @return array<string, mixed> */
    private static function toLocaleMap(mixed $value): array
    {
        $locales = array_values((array) config('tbtop-admin.content_locales', ['en']));
        $default = (string) config('tbtop-admin.default_content_locale', '');
        if ($default === '' || ! in_array($default, $locales, true)) {
            $default = $locales[0] ?? 'en';
        }
        $map = array_fill_keys($locales, null);
        $map[$default] = $value;

        return $map;
    }
}
