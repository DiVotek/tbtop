<?php

namespace Tbtop\Admin\Dsl;

/**
 * Declared keys only, scalars cast to string — the one dep shape every
 * record-seeded closure sees, at build time and per endpoint request.
 * Empty strings drop out: client readDeps() omits them, and keeping them
 * would desync seeded initialDeps from the key a mounting region computes.
 *
 * A translatable field's record value is a locale map, never a scalar, so a
 * dependency on one is declared per locale ("title.en") and resolved through
 * the map here — matching readDeps() on the client, which does the same for
 * the live payload.
 */
final class DependencyFilter
{
    /**
     * @param  list<string>  $declared
     * @param  array<string, mixed>  $bag
     * @return array<string, string>
     */
    public static function filter(array $declared, array $bag): array
    {
        $out = [];
        foreach ($declared as $field) {
            $value = self::resolve($bag, $field);
            if (is_scalar($value) && (string) $value !== '') {
                $out[$field] = (string) $value;
            }
        }

        return $out;
    }

    /** @param  array<string, mixed>  $bag */
    private static function resolve(array $bag, string $field): mixed
    {
        if (array_key_exists($field, $bag)) {
            return $bag[$field];
        }

        $dot = strpos($field, '.');

        if ($dot === false || $dot === 0) {
            return null;
        }

        $parent = $bag[substr($field, 0, $dot)] ?? null;

        return is_array($parent) ? ($parent[substr($field, $dot + 1)] ?? null) : null;
    }
}
