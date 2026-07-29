<?php

namespace Tbtop\Admin\I18n;

/**
 * Projects a stored translatable value down to one displayable string.
 *
 * Translatable columns hold a locale map ({"en": "...", "uk": "..."}), but rows
 * written before a field became translatable still carry plain scalars, so
 * every reader must handle both shapes.
 */
final class TranslatableValue
{
    /** Value in the default content locale, else the first non-empty one. */
    public static function pick(mixed $raw): mixed
    {
        $map = self::asLocaleMap($raw);
        if ($map === null) {
            // A raw JSON column holds encoded scalars too ('"text"'); decoding
            // keeps a pre-translatable row from rendering with literal quotes.
            return self::decodeScalar($raw);
        }

        $default = LocaleService::defaultContentLocale();
        $value = $map[$default] ?? null;
        if ($value !== null && $value !== '') {
            return $value;
        }

        foreach ($map as $candidate) {
            if ($candidate !== null && $candidate !== '') {
                return $candidate;
            }
        }

        return null;
    }

    private static function decodeScalar(mixed $raw): mixed
    {
        if (! is_string($raw) || ! str_starts_with($raw, '"')) {
            return $raw;
        }
        $decoded = json_decode($raw);

        return is_string($decoded) ? $decoded : $raw;
    }

    /** @return array<string, mixed>|null Null when the value is not a locale map. */
    public static function asLocaleMap(mixed $raw): ?array
    {
        if (is_string($raw) && str_starts_with($raw, '{')) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : $raw;
        }
        if (! is_array($raw) || array_is_list($raw)) {
            return null;
        }

        return $raw;
    }
}
