<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;
use InvalidArgumentException;

/** Placeholder for text-like fields: one string, or one per content locale. */
trait HasLocalePlaceholder
{
    /**
     * Placeholder text shown while the field is empty. Pass a locale map
     * (`['en' => 'Page title', 'uk' => 'Назва сторінки']`) on a translatable field
     * to show each locale's text on its own tab; a locale missing from the map
     * shows none. A non-translatable field reads the default content locale.
     * A Closure may return either form; its map is checked when it resolves.
     *
     * @param  string|array<array-key, mixed>|(Closure(): (string|array<array-key, mixed>))  $text  one string, or locale => string (checked)
     */
    public function placeholder(string|array|Closure $text): static
    {
        if ($text instanceof Closure) {
            return $this->set('placeholder', fn () => self::checkedPlaceholder($text()));
        }

        return $this->set('placeholder', self::checkedPlaceholder($text));
    }

    /** @return string|array<string, string> */
    private static function checkedPlaceholder(mixed $text): string|array
    {
        if (is_string($text)) {
            return $text;
        }
        if (! is_array($text)) {
            throw new InvalidArgumentException('A placeholder must be a string or a locale map.');
        }
        foreach ($text as $locale => $value) {
            if (! is_string($locale) || ! is_string($value)) {
                throw new InvalidArgumentException('A placeholder locale map needs locale keys and string values.');
            }
        }

        /** @var array<string, string> $text */
        return $text;
    }
}
