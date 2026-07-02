<?php

namespace Tbtop\Admin\Http;

use Carbon\Carbon;

/**
 * Shared declarative kind formatting for date/datetime/number/money values.
 *
 * Used by both the table projection (ColumnProjection) and the displayValue
 * display block so a value formats identically whether it lands in a table
 * cell or a detail view. Only reads the kind string + its format metadata.
 */
final class KindFormat
{
    /** @param  array<string, mixed>  $meta */
    public static function apply(string $kind, array $meta, mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return $value;
        }

        return match ($kind) {
            'date' => self::formatDate($value, $meta['format'] ?? 'Y-m-d'),
            'datetime' => self::formatDate($value, $meta['format'] ?? 'Y-m-d H:i:s'),
            'time' => self::formatDate($value, $meta['format'] ?? 'H:i'),
            'number' => isset($meta['decimals'])
                ? number_format((float) $value, $meta['decimals'])
                : $value,
            'money' => isset($meta['currency'])
                ? number_format((float) $value / 100, 2).' '.$meta['currency']
                : $value,
            default => $value,
        };
    }

    private static function formatDate(mixed $value, string $format): mixed
    {
        try {
            return Carbon::parse((string) $value)->format($format);
        } catch (\Throwable) {
            return $value;
        }
    }
}
