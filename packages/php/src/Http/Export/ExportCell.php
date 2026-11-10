<?php

namespace Tbtop\Admin\Http\Export;

use BackedEnum;
use JsonSerializable;
use Stringable;
use Tbtop\Admin\Dsl\Column;
use UnitEnum;

/**
 * Turns a projected cell value into what a file cell holds: the text the
 * table shows. Kinds the client renders from metadata — a boolean icon, a
 * badge or select label — resolve to that text here, since a file has no
 * renderer. Numbers stay numbers so a spreadsheet can sum them.
 */
final class ExportCell
{
    public static function value(Column $column, mixed $value): string|int|float
    {
        if ($value === null) {
            return '';
        }
        if ($column->getKind() === 'boolean' || is_bool($value)) {
            return self::boolean($value);
        }
        $label = self::label($column, $value);
        if ($label !== null) {
            return $label;
        }

        return self::scalar($value);
    }

    private static function boolean(mixed $value): string
    {
        $on = is_string($value) ? filter_var($value, FILTER_VALIDATE_BOOL) : (bool) $value;

        return (string) __($on ? 'tbtop-admin::admin.export.yes' : 'tbtop-admin::admin.export.no');
    }

    /** A badge label or an editable select's option label for the stored value. */
    private static function label(Column $column, mixed $value): ?string
    {
        $key = self::key($value);
        if ($key === null) {
            return null;
        }
        if ($column->getKind() === 'badge') {
            $labels = (array) ($column->getKindMeta()['badge']['labels'] ?? []);

            return isset($labels[$key]) ? (string) $labels[$key] : null;
        }
        foreach ($column->editOptionEntries() as $option) {
            if ((string) $option['value'] === $key && isset($option['label'])) {
                return $option['label'];
            }
        }

        return null;
    }

    private static function key(mixed $value): ?string
    {
        if ($value instanceof BackedEnum) {
            return (string) $value->value;
        }

        return is_int($value) || is_string($value) ? (string) $value : null;
    }

    private static function scalar(mixed $value): string|int|float
    {
        if (is_int($value) || is_float($value)) {
            return $value;
        }
        if (is_string($value)) {
            return $value;
        }
        if ($value instanceof BackedEnum) {
            return $value->value;
        }
        if ($value instanceof UnitEnum) {
            return $value->name;
        }
        if ($value instanceof Stringable) {
            return (string) $value;
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return self::flatten($value);
    }

    /** Lists join with ", "; anything else is written as JSON. */
    private static function flatten(mixed $value): string
    {
        if ($value instanceof JsonSerializable) {
            $value = $value->jsonSerialize();
        }
        if (is_array($value) && array_is_list($value) && self::allScalar($value)) {
            return implode(', ', array_map(static fn ($v): string => is_bool($v) ? ($v ? '1' : '0') : (string) $v, $value));
        }

        return (string) json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /** @param  list<mixed>  $values */
    private static function allScalar(array $values): bool
    {
        foreach ($values as $v) {
            if ($v !== null && ! is_scalar($v)) {
                return false;
            }
        }

        return true;
    }
}
