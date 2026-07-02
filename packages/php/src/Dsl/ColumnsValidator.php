<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;

/**
 * Validates the int|breakpoint-object column shape shared by
 * S::grid()'s cols, S::section()'s columns, and Field's colSpan/colStart.
 */
final class ColumnsValidator
{
    private const MIN = 1;

    private const MAX = 8;

    private const BREAKPOINTS = ['sm', 'md', 'lg', 'xl'];

    /** @param  int|array<string, mixed>  $value */
    public static function validate(int|array $value, string $label): void
    {
        if (is_int($value)) {
            self::validateInt($value, $label);

            return;
        }

        foreach ($value as $breakpoint => $n) {
            if (! in_array($breakpoint, self::BREAKPOINTS, true)) {
                throw new InvalidArgumentException(
                    "Invalid {$label} breakpoint \"{$breakpoint}\". Allowed: ".implode(', ', self::BREAKPOINTS).'.',
                );
            }
            if (! is_int($n)) {
                throw new InvalidArgumentException("Invalid {$label}.{$breakpoint}: must be an integer.");
            }
            self::validateInt($n, "{$label}.{$breakpoint}");
        }
    }

    private static function validateInt(int $value, string $label): void
    {
        if ($value < self::MIN || $value > self::MAX) {
            throw new InvalidArgumentException(
                "Invalid {$label} {$value}. Must be between ".self::MIN.' and '.self::MAX.'.',
            );
        }
    }
}
