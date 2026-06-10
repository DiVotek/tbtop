<?php

namespace Tbtop\Admin\I18n;

use Illuminate\Support\Facades\Session;

class LocaleService
{
    public static function currentLocale(): string
    {
        $configured = (array) config('tbtop-admin.locales', ['en']);
        $default = (string) config('tbtop-admin.default_locale', $configured[0] ?? 'en');
        $stored = Session::get('tbtop.locale');

        if (is_string($stored) && in_array($stored, $configured, true)) {
            return $stored;
        }

        return $default;
    }

    /** @return list<string> */
    public static function availableLocales(): array
    {
        return array_values((array) config('tbtop-admin.locales', ['en']));
    }

    /** @return array<string, string> Flat dot-notation messages for the client */
    public static function messagesFor(string $locale): array
    {
        $translation = trans()->get('tbtop-admin::admin', [], $locale);

        if (! is_array($translation)) {
            return [];
        }

        /** @var array<string, mixed> $raw */
        $raw = $translation;

        if (empty($raw)) {
            return [];
        }

        return self::flatten($raw);
    }

    /**
     * @param  array<string, mixed>  $array
     * @return array<string, string>
     */
    private static function flatten(array $array, string $prefix = ''): array
    {
        $result = [];
        foreach ($array as $key => $value) {
            $dotKey = $prefix === '' ? (string) $key : "{$prefix}.{$key}";
            if (is_array($value)) {
                $result = array_merge($result, self::flatten($value, $dotKey));
            } else {
                $result[$dotKey] = (string) $value;
            }
        }

        return $result;
    }
}
