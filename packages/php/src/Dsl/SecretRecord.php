<?php

namespace Tbtop\Admin\Dsl;

use Tbtop\Admin\Dsl\Fields\Password;

/**
 * The record and submit side of Password::secret(): the stored value is
 * seeded into the field (so it can show "Set" and a preview), then dropped
 * from the record before it ships as page props; on submit, a field the user
 * left alone stays absent and a clear only counts on a clearable() field.
 */
final class SecretRecord
{
    /**
     * @param  array<string, mixed>  $record  The record with defaults seeded, before it is stripped.
     * @param  list<mixed>  $children
     */
    public static function seed(array $record, array $children): void
    {
        foreach (self::secretFields($children) as $field) {
            $field->seedStored($record[$field->name] ?? null);
        }
    }

    /**
     * @param  array<string, mixed>  $record
     * @param  list<mixed>  $children
     * @return array<string, mixed>
     */
    public static function strip(array $record, array $children): array
    {
        foreach (self::secretFields($children) as $field) {
            unset($record[$field->name]);
        }

        return $record;
    }

    /**
     * Submitted input with every secret field's `null` dropped unless the field
     * is clearable(): the key is then absent, as for a field the user left alone.
     *
     * @param  array<string, mixed>  $input
     * @param  list<mixed>  $children
     * @return array<string, mixed>
     */
    public static function applyInput(array $input, array $children): array
    {
        foreach (self::secretFields($children) as $field) {
            $sent = array_key_exists($field->name, $input);
            if ($sent && $input[$field->name] === null && ! $field->isClearable()) {
                unset($input[$field->name]);
            }
        }

        return $input;
    }

    /**
     * @param  list<mixed>  $children
     * @return list<Password>
     */
    private static function secretFields(array $children): array
    {
        return array_values(array_filter(
            RecordDefaults::topLevelFields($children),
            static fn (mixed $f): bool => $f instanceof Password && $f->isSecret(),
        ));
    }
}
