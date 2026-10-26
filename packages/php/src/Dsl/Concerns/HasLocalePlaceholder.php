<?php

namespace Tbtop\Admin\Dsl\Concerns;

use InvalidArgumentException;

/** Placeholder for text-like fields: one string, or one per content locale. */
trait HasLocalePlaceholder
{
    /**
     * Placeholder text shown while the field is empty. Pass a locale map
     * (`['en' => 'Page title', 'uk' => 'Назва сторінки']`) on a translatable field
     * to show each locale's text on its own tab; a locale missing from the map
     * shows none. A non-translatable field reads the default content locale.
     *
     * @param  string|array<array-key, mixed>  $text  one string, or locale => string (checked)
     */
    public function placeholder(string|array $text): static
    {
        if (is_array($text)) {
            foreach ($text as $locale => $value) {
                if (! is_string($locale) || ! is_string($value)) {
                    throw new InvalidArgumentException('A placeholder locale map needs locale keys and string values.');
                }
            }
        }

        return $this->set('placeholder', $text);
    }
}
