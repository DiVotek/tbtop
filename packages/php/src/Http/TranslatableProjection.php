<?php

namespace Tbtop\Admin\Http;

use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\I18n\LocaleService;

/**
 * Flattens translatable column values ({locale: value} maps) to the default
 * content locale scalar so table cells receive plain values, not objects.
 */
final class TranslatableProjection
{
    /**
     * @param  iterable<int, mixed>  $rows
     * @return list<mixed>
     */
    public static function apply(TableBuilder $table, iterable $rows): array
    {
        $columns = $table->translatableColumns();
        $out = [];
        foreach ($rows as $row) {
            $out[] = $columns === [] ? $row : self::projectRow($row, $columns);
        }

        return $out;
    }

    /** @param  list<string>  $columns */
    private static function projectRow(mixed $row, array $columns): mixed
    {
        foreach ($columns as $column) {
            $raw = data_get($row, $column);
            $projected = self::pickLocale($raw);
            if ($projected !== $raw) {
                data_set($row, $column, $projected);
            }
        }

        return $row;
    }

    private static function pickLocale(mixed $raw): mixed
    {
        $map = self::asLocaleMap($raw);
        if ($map === null) {
            return $raw;
        }
        $default = LocaleService::defaultContentLocale();
        $value = $map[$default] ?? null;
        if ($value !== null && $value !== '') {
            return $value;
        }
        foreach ($map as $candidate) {
            if ($candidate !== null && $candidate !== '') {
                return $candidate;
            }
        }

        return null;
    }

    /** @return array<string, mixed>|null */
    private static function asLocaleMap(mixed $raw): ?array
    {
        if (is_string($raw) && str_starts_with($raw, '{')) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : $raw;
        }
        if (! is_array($raw) || array_is_list($raw)) {
            return null;
        }

        return $raw;
    }
}
