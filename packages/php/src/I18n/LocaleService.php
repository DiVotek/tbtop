<?php

namespace Tbtop\Admin\I18n;

use Illuminate\Support\Facades\Session;
use Tbtop\Admin\Panels\CurrentPanel;

class LocaleService
{
    public static function currentLocale(): string
    {
        $available = self::availableLocales();
        $default = CurrentPanel::current()?->defaultLocale() ?? 'en';
        $stored = Session::get('tbtop.locale');

        if (is_string($stored) && in_array($stored, $available, true)) {
            return $stored;
        }

        return $default;
    }

    /** UI locales of the current panel; ['en'] outside panel requests. @return list<string> */
    public static function availableLocales(): array
    {
        return CurrentPanel::current()?->locales() ?? ['en'];
    }

    /** @return list<string> */
    public static function contentLocales(): array
    {
        return array_values((array) config('tbtop-admin.content_locales', ['en']));
    }

    public static function defaultContentLocale(): string
    {
        $locales = self::contentLocales();
        $configured = (string) config('tbtop-admin.default_content_locale', '');
        if ($configured !== '' && in_array($configured, $locales, true)) {
            return $configured;
        }

        return $locales[0] ?? 'en';
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
