<?php

namespace Tbtop\Admin\Http;

use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use InvalidArgumentException;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Support\ContainsMatch;

/**
 * Applies filter values to a query builder using field-kind-driven rules.
 * Declaration order = application order.
 */
final class TableFilterApplier
{
    /** Kinds that use WHERE = */
    private const EQUALITY_KINDS = ['select', 'radio', 'number', 'date', 'datetime', 'time'];

    /** Kinds that use WHERE LIKE %v% */
    private const LIKE_KINDS = ['text', 'textarea', 'slug', 'password'];

    /**
     * @param  list<Field>  $fields
     * @param  array<string, mixed>  $filterValues
     */
    public static function apply(
        array $fields,
        array $filterValues,
        EloquentBuilder|QueryBuilder $builder,
    ): void {
        foreach ($fields as $field) {
            $name = $field->name;
            if (! array_key_exists($name, $filterValues)) {
                continue;
            }
            $value = $filterValues[$name];
            if (self::isEmpty($value)) {
                continue;
            }
            self::applyField($field, $value, $builder);
        }
    }

    /**
     * How a caller writes $field's filter value — kept beside applyField() so
     * the description cannot drift from what the query does with it.
     */
    public static function valueShape(Field $field): string
    {
        if ($field->filterClosure() !== null) {
            return 'custom filter: value is passed as-is to the page\'s closure';
        }
        $kind = self::resolveKind($field);

        return match (true) {
            in_array($kind, self::LIKE_KINDS, true) => 'string, matched as a substring',
            in_array($kind, self::EQUALITY_KINDS, true) => 'exact value, or an array of values a row matches any of',
            $kind === 'boolean' => 'boolean',
            $kind === 'tags', $kind === 'in' => 'array of values, a row matches any of them',
            $kind === 'daterange' => '{"from": "Y-m-d", "to": "Y-m-d"}, either bound optional',
            default => "unsupported kind \"{$kind}\"",
        };
    }

    private static function applyField(
        Field $field,
        mixed $value,
        EloquentBuilder|QueryBuilder $builder,
    ): void {
        if ($field->filterClosure() !== null) {
            ($field->filterClosure())($builder, $value);

            return;
        }

        $kind = self::resolveKind($field);
        $name = $field->name;

        if (in_array($kind, self::LIKE_KINDS, true)) {
            // The query string is browser-supplied: ?filters[title][]=x is an
            // array, which would 500 on the string term. Ignore it instead.
            if (is_scalar($value)) {
                ContainsMatch::where($builder, $name, (string) $value);
            }

            return;
        }

        if (in_array($kind, self::EQUALITY_KINDS, true)) {
            if (is_array($value)) {
                // A multiple select sends an array; where() would bind only its first value.
                $builder->whereIn($name, array_values(array_filter($value, is_scalar(...))));

                return;
            }
            $builder->where($name, $value);

            return;
        }

        if ($kind === 'boolean') {
            if (is_scalar($value)) {
                $builder->where($name, self::castBoolean($value));
            }

            return;
        }

        if ($kind === 'tags' || $kind === 'in') {
            self::applyIn($name, $value, $builder);

            return;
        }

        if ($kind === 'daterange') {
            self::applyDaterange($name, $value, $builder);

            return;
        }

        throw new InvalidArgumentException(
            "No default filter mapping for field kind \"{$kind}\" (field \"{$name}\"). "
            .'Add a filterUsing() closure or use a supported kind.'
        );
    }

    /** @param  array<string, mixed>|mixed  $value */
    private static function applyDaterange(
        string $name,
        mixed $value,
        EloquentBuilder|QueryBuilder $builder,
    ): void {
        if (! is_array($value)) {
            return;
        }
        $from = ($value['from'] ?? '') ?: null;
        $to = ($value['to'] ?? '') ?: null;
        if ($from !== null) {
            $builder->where($name, '>=', $from);
        }
        if ($to !== null) {
            // whereDate keeps the end day inclusive on datetime columns, where
            // a plain `<= 'Y-m-d'` stops at midnight and drops that day's rows.
            $builder->whereDate($name, '<=', $to);
        }
    }

    /**
     * A row matches any of the values. Nested arrays are dropped — whereIn()
     * throws on them — and a value list left empty filters nothing.
     */
    private static function applyIn(string $name, mixed $value, EloquentBuilder|QueryBuilder $builder): void
    {
        $values = array_values(array_filter(is_array($value) ? $value : [$value], is_scalar(...)));
        if ($values !== []) {
            $builder->whereIn($name, $values);
        }
    }

    private static function castBoolean(bool|int|float|string $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        $str = strtolower((string) $value);

        return in_array($str, ['1', 'true', 'yes'], true);
    }

    private static function isEmpty(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return true;
        }

        return is_array($value) && $value === [];
    }

    /** Reads the kind from the field node (kind() is protected, use toNode). */
    private static function resolveKind(Field $field): string
    {
        return $field->toNode()->kind;
    }
}
