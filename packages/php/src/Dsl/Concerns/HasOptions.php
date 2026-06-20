<?php

namespace Tbtop\Admin\Dsl\Concerns;

/**
 * Shared {value, label} options() for the fixed-option fields (Select, Radio,
 * CheckboxList, ToggleButtons, InFilter). Values are string-normalized so the
 * wire shape matches form data and URL params.
 *
 * Adopters get the Field base, which supplies set() + normalizeOptionValues().
 */
trait HasOptions
{
    /** @param  list<array{value: mixed, label: string}>  $options */
    public function options(array $options): static
    {
        return $this->set('options', self::normalizeOptionValues($options));
    }
}
