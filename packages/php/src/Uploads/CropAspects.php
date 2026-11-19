<?php

namespace Tbtop\Admin\Uploads;

use InvalidArgumentException;

/** Validates the aspect list of Upload::crop()/cropAspects(): 'W:H' with positive numbers, or 'free'. */
final class CropAspects
{
    private const PATTERN = '/^(?:free|\d+(?:\.\d+)?:\d+(?:\.\d+)?)$/';

    /**
     * @param  array<mixed>  $aspects
     * @return non-empty-list<string>
     */
    public static function normalize(array $aspects): array
    {
        if ($aspects === []) {
            throw new InvalidArgumentException('Upload::cropAspects() needs at least one aspect.');
        }
        $out = [];
        foreach ($aspects as $aspect) {
            $out[] = self::one($aspect);
        }

        return array_values(array_unique($out));
    }

    private static function one(mixed $aspect): string
    {
        $value = is_string($aspect) ? trim($aspect) : '';
        if (preg_match(self::PATTERN, $value) !== 1 || self::hasZeroSide($value)) {
            throw new InvalidArgumentException(
                "Invalid crop aspect '".(is_scalar($aspect) ? (string) $aspect : get_debug_type($aspect))."': use 'W:H' (e.g. '16:9') or 'free'."
            );
        }

        return $value;
    }

    private static function hasZeroSide(string $value): bool
    {
        if ($value === 'free') {
            return false;
        }
        [$w, $h] = explode(':', $value);

        return (float) $w <= 0 || (float) $h <= 0;
    }
}
