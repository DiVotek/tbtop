<?php

namespace Tbtop\Admin\Http;

use Illuminate\Database\Eloquent\Model;
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
        $recordUrl = $table->recordUrlResolver();

        $out = [];
        foreach ($rows as $row) {
            $projected = $columns === [] ? $row : self::projectRow($row, $columns);
            if ($recordUrl !== null) {
                data_set($projected, '_recordUrl', $recordUrl($row));
            }
            $out[] = $projected;
        }

        return $out;
    }

    /**
     * Eloquent models project to a plain array (so toArray() casts/accessors
     * — incl. Spatie locale re-expansion — never re-run after us); other rows
     * (stdClass from query builder) mutate in place. Mixed return is fine:
     * response()->json serializes both the same.
     *
     * @param  list<Column>  $columns
     */
    private static function projectRow(mixed $row, array $columns): mixed
    {
        if ($row instanceof Model) {
            return self::projectModelToArray($row, $columns);
        }

        return self::projectInPlace($row, $columns);
    }

    /**
     * Build output from the model's array form and overwrite each declared
     * column; the model is never mutated. Translatable columns read the raw
     * locale map (bypassing the flattening accessor); the rest read from the
     * toArray result via data_get, so dotted relation columns (location.name)
     * resolve the nested value, matching the query-builder path. The resolved
     * value is written back under the flat dotted key the client reads.
     *
     * @param  list<Column>  $columns
     * @return array<string, mixed>
     */
    private static function projectModelToArray(Model $row, array $columns): array
    {
        $out = $row->toArray();
        foreach ($columns as $col) {
            $name = $col->name;
            $source = $col->isTranslatable()
                ? self::rawAttribute($row, $name)
                : data_get($out, $name);
            $out[$name] = self::computeValue($col, $source);
        }

        return $out;
    }

    /**
     * @param  list<Column>  $columns
     */
    private static function projectInPlace(mixed $row, array $columns): mixed
    {
        foreach ($columns as $col) {
            $name = $col->name;
            $raw = data_get($row, $name);
            $value = self::computeValue($col, $raw);
            if ($value !== $raw) {
                data_set($row, $name, $value);
            }
        }

        return $row;
    }

    /** translatable → formatUsing → declarative kind format. */
    private static function computeValue(Column $col, mixed $value): mixed
    {
        if ($col->isTranslatable()) {
            $value = self::pickLocale($value);
        }
        $fmt = $col->getFormatUsing();
        if ($fmt !== null) {
            return $fmt($value);
        }

        return self::applyKindFormat($col, $value);
    }

    /** Pre-accessor, pre-cast value: the stored JSON map for Spatie + array-cast. */
    private static function rawAttribute(Model $row, string $name): mixed
    {
        return $row->getRawOriginal($name);
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
