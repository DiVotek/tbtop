<?php

namespace Tbtop\Admin\Dsl;

use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Repeater;

/**
 * Seeds ->default() values into a form's record before it ships as page props.
 *
 * Absent keys only: record(['x' => null]) means "explicitly empty" and survives,
 * record([]) means "unset" and gets the default. Consumers opt out by passing
 * the key.
 */
final class RecordDefaults
{
    /**
     * @param  array<string, mixed>  $record
     * @param  list<mixed>  $children
     * @return array<string, mixed>
     */
    public static function apply(array $record, array $children): array
    {
        foreach (self::fields($children) as $field) {
            if (array_key_exists($field->name, $record)) {
                continue;
            }
            $seed = self::seedFor($field);
            if ($seed !== null) {
                $record[$field->name] = $seed;
            }
        }

        return $record;
    }

    /**
     * Fields addressable at the record's top level: layout containers are
     * transparent, but repeater rows are their own data level — a domain
     * rule of this reader, not the traversal, so it stays a predicate here
     * rather than a StructureWalk key.
     *
     * @param  list<mixed>  $children
     * @return list<Field>
     */
    private static function fields(array $children): array
    {
        $out = [];
        foreach ($children as $child) {
            if (! ChildInclusion::isConditionMet($child)) {
                continue;
            }
            if ($child instanceof Field) {
                $out[] = $child;
            }
            if ($child instanceof Repeater) {
                continue;
            }
            $out = [...$out, ...self::fields(StructureWalk::descendants($child))];
        }

        return $out;
    }

    private static function seedFor(Field $field): mixed
    {
        $default = $field->defaultValue();
        if ($field instanceof Repeater) {
            return self::repeaterRows($field, $default);
        }

        return $default;
    }

    /**
     * defaultItems is a row count, default is row content — independent axes.
     * Rows beyond the supplied content are created empty, so a repeater can
     * ship pre-filled rows plus blank ones as a prompt.
     */
    private static function repeaterRows(Repeater $field, mixed $default): ?array
    {
        $rows = is_array($default) ? array_values($default) : [];
        $wanted = $field->defaultItemCount();
        if ($rows === [] && $wanted === 0) {
            return null;
        }

        // Rows are objects on the wire; PHP's [] would serialize as a JSON array.
        return array_pad($rows, $wanted, new \stdClass);
    }
}
