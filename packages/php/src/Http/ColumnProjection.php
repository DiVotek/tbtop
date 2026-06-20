<?php

namespace Tbtop\Admin\Http;

use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\I18n\LocaleService;

/**
 * Applies per-column server-side projections to a result set.
 *
 * Pipeline order per visible column:
 *   1. translatable  — flatten locale-map to default content locale
 *   2. formatUsing   — arbitrary Closure($value) → $value
 *   3. declarative   — date/datetime/number/money formatting
 *
 * Hidden columns are never processed.
 */
final class ColumnProjection
{
    /**
     * @param  iterable<int, mixed>  $rows
     * @return list<mixed>
     */
    public static function apply(TableBuilder $table, iterable $rows): array
    {
        $columns = array_filter(
            $table->allColumns(),
            fn (Column $c) => $c->isVisible(),
        );

        if ($columns === []) {
            return iterator_to_array($rows, false);
        }

        $out = [];
        foreach ($rows as $row) {
            $out[] = self::projectRow($row, $columns);
        }

        return $out;
    }

    /**
     * @param  list<Column>  $columns
     */
    private static function projectRow(mixed $row, array $columns): mixed
    {
        foreach ($columns as $col) {
            $name = $col->name;
            $raw = data_get($row, $name);
            $value = $raw;

            if ($col->isTranslatable()) {
                $value = self::pickLocale($value);
            }

            $fmt = $col->getFormatUsing();
            if ($fmt !== null) {
                $value = $fmt($value);
            }

            if ($fmt === null) {
                $value = self::applyKindFormat($col, $value);
            }

            if ($value !== $raw) {
                data_set($row, $name, $value);
            }
        }

        return $row;
    }

    private static function applyKindFormat(Column $col, mixed $value): mixed
    {
        return KindFormat::apply($col->getKind() ?? '', $col->getKindMeta(), $value);
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
