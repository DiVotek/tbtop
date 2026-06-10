<?php

namespace Tbtop\Admin\Validation;

final class ConstraintMap
{
    private const VALUELESS = ['required', 'email', 'url', 'integer'];

    private const VALUED = ['min', 'max', 'regex', 'in'];

    /**
     * Maps a Laravel rule list to the wire constraint vocabulary.
     * Unknown rules are skipped: the server re-validates anyway.
     *
     * @param  list<string>  $rules
     * @return array<string, mixed>
     */
    public static function toConstraints(array $rules): array
    {
        $constraints = [];
        foreach ($rules as $rule) {
            [$name, $value] = self::parse($rule);
            if (in_array($name, self::VALUELESS, true)) {
                $constraints[$name] = true;
            } elseif (in_array($name, self::VALUED, true) && $value !== null) {
                $constraints[$name] = self::cast($name, $value);
            }
        }

        return $constraints;
    }

    /** @return array{0: string, 1: ?string} */
    private static function parse(string $rule): array
    {
        $colon = strpos($rule, ':');
        if ($colon === false) {
            return [$rule, null];
        }

        return [substr($rule, 0, $colon), substr($rule, $colon + 1)];
    }

    private static function cast(string $name, string $value): mixed
    {
        if ($name === 'in') {
            return explode(',', $value);
        }
        if ($name === 'min' || $name === 'max') {
            return is_numeric($value) ? $value + 0 : $value;
        }
        if ($name === 'regex') {
            return self::bareJsPattern($value);
        }

        return $value;
    }

    /**
     * Laravel regex values carry PCRE delimiters (`/pat/i`); the client
     * feeds the wire value to `new RegExp`, so emit the bare pattern.
     * Flags are dropped - the server re-validates with the full rule.
     */
    private static function bareJsPattern(string $value): string
    {
        $delimiter = $value[0] ?? '';
        $end = strrpos($value, $delimiter, 1);
        if ($delimiter === '' || $end === false) {
            return $value;
        }

        return substr($value, 1, $end - 1);
    }
}
