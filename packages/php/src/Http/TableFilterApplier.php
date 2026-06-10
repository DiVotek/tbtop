<?php

namespace Tbtop\Admin\Http;

use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use InvalidArgumentException;
use Tbtop\Admin\Dsl\Fields\Field;

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
            $builder->where($name, 'like', "%{$value}%");

            return;
        }

        if (in_array($kind, self::EQUALITY_KINDS, true)) {
            $builder->where($name, $value);

            return;
        }

        if ($kind === 'boolean') {
            $builder->where($name, self::castBoolean($value));

            return;
        }

        if ($kind === 'tags') {
            $values = is_array($value) ? $value : [$value];
            $builder->whereIn($name, $values);

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
            $builder->where($name, '<=', $to);
        }
    }

    private static function castBoolean(mixed $value): bool
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
