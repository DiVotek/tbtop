<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;

/**
 * Maps a field-comparison Cond to the Laravel rule string that reproduces its
 * semantics server-side. Laravel resolves `required_if`/`required_unless`
 * against sibling request fields at validate() time, so a plain string rule
 * is sufficient - no request-data access is needed at DSL build time.
 *
 * Numeric-comparison ops (gt/gte/lt/lte) and combinators (all/any/not/server)
 * have no equivalent Laravel rule and are rejected at builder time instead of
 * silently producing an unenforced requirement.
 */
final class CondToRequiredRule
{
    public static function rule(Cond $cond): string
    {
        $data = json_decode(json_encode($cond), true);
        $op = $data['op'];

        return match ($op) {
            'eq' => 'required_if:'.$data['field'].','.self::stringify($data['value']),
            'in' => 'required_if:'.$data['field'].','.self::stringifyList($data['value']),
            'neq' => 'required_unless:'.$data['field'].','.self::stringify($data['value']),
            'notIn' => 'required_unless:'.$data['field'].','.self::stringifyList($data['value']),
            'notEmpty', 'truthy' => 'required_with:'.$data['field'],
            'empty' => 'required_without:'.$data['field'],
            default => throw new InvalidArgumentException(
                "requiredIf: operator \"{$op}\" is not supported server-side",
            ),
        };
    }

    private static function stringify(mixed $value): string
    {
        $string = match (true) {
            is_bool($value) => $value ? 'true' : 'false',
            default => (string) $value,
        };
        // Laravel's rule-string format has no escaping: a comma in the value
        // would split into several accepted values and diverge from the client.
        if (str_contains($string, ',')) {
            throw new InvalidArgumentException(
                "requiredIf: value \"{$string}\" contains a comma, which cannot be encoded in a Laravel rule string",
            );
        }

        return $string;
    }

    /** @param  list<mixed>  $values */
    private static function stringifyList(array $values): string
    {
        return implode(',', array_map(self::stringify(...), $values));
    }
}
