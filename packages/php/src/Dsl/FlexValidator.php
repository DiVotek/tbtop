<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;

/**
 * Validates flex layout option values for S::flex().
 */
final class FlexValidator
{
    private const DIRECTION_VALUES = ['row', 'col'];

    private const JUSTIFY_VALUES = ['start', 'center', 'end', 'between', 'around', 'evenly'];

    private const ALIGN_VALUES = ['start', 'center', 'end', 'stretch', 'baseline'];

    private const GAP_MIN = 0;

    private const GAP_MAX = 12;

    public static function direction(string $value): void
    {
        if (! in_array($value, self::DIRECTION_VALUES, true)) {
            throw new InvalidArgumentException(
                "Invalid flex direction \"{$value}\". Allowed: ".implode(', ', self::DIRECTION_VALUES).'.',
            );
        }
    }

    public static function justify(string $value): void
    {
        if (! in_array($value, self::JUSTIFY_VALUES, true)) {
            throw new InvalidArgumentException(
                "Invalid flex justify \"{$value}\". Allowed: ".implode(', ', self::JUSTIFY_VALUES).'.',
            );
        }
    }

    public static function align(string $value): void
    {
        if (! in_array($value, self::ALIGN_VALUES, true)) {
            throw new InvalidArgumentException(
                "Invalid flex align \"{$value}\". Allowed: ".implode(', ', self::ALIGN_VALUES).'.',
            );
        }
    }

    public static function gap(int $value): void
    {
        if ($value < self::GAP_MIN || $value > self::GAP_MAX) {
            throw new InvalidArgumentException(
                "Invalid flex gap {$value}. Must be between ".self::GAP_MIN.' and '.self::GAP_MAX.'.',
            );
        }
    }
}
