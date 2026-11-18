<?php

namespace Tbtop\Admin\Dsl;

use LogicException;
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
        self::assertTopLevel($children);
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
     * Submitted input with every secret field's `null` (or `''`, which counts as
     * null even where ConvertEmptyStringsToNull does not run) dropped unless the
     * field is clearable(): the key is then absent, as for a field left alone.
     *
     * @param  array<string, mixed>  $input
     * @param  list<mixed>  $children
     * @return array<string, mixed>
     */
    public static function applyInput(array $input, array $children): array
    {
        foreach (self::secretFields($children) as $field) {
            if (! array_key_exists($field->name, $input)) {
                continue;
            }
            if ($input[$field->name] === '') {
                $input[$field->name] = null;
            }
            if ($input[$field->name] === null && ! $field->isClearable()) {
                unset($input[$field->name]);
            }
        }

        return $input;
    }

    /**
     * A secret() inside a repeater row is neither seeded nor stripped, so its
     * stored value would ship in the props: refuse it instead of leaking.
     *
     * @param  list<mixed>  $children
     */
    private static function assertTopLevel(array $children): void
    {
        $top = self::secretFields($children);
        foreach ($children as $child) {
            $all = StructureWalk::collect($child, static fn (mixed $c): bool => $c instanceof Password && $c->isSecret());
            foreach ($all as $field) {
                if (! in_array($field, $top, true)) {
                    throw new LogicException("password \"{$field->name}\": secret() works on a top-level form field only, not inside a repeater.");
                }
            }
        }
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
