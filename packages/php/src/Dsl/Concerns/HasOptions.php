<?php

namespace Tbtop\Admin\Dsl\Concerns;

/**
 * Shared {value, label} options() for the fixed-option fields (Select, Radio,
 * CheckboxList, ToggleButtons, InFilter). Values are string-normalized so the
 * wire shape matches form data and URL params.
 *
 * An option may also carry 'description' (muted helper text) and 'disabled'
 * (bool) — both pass through unchanged; only Radio's client renders them today.
 *
 * Select additionally reads 'display': 'image' (url), 'subtitle' (muted second
 * line) and 'html' (raw markup). 'html' wins — when present it renders alone and
 * the other two are ignored. It is NOT sanitized anywhere; escaping
 * author-composed markup is the caller's job. 'label' stays required either way:
 * it feeds search, aria-labels and typeahead, and never reads from 'html'.
 *
 * Adopters get the Field base, which supplies set() + normalizeOptionValues().
 */
trait HasOptions
{
    /**
     * Set the fixed option list. Each entry is {value, label, description?,
     * disabled?, display?} — values are string-normalized on the wire, so seed
     * default()/query results with string values too. 'display' (image,
     * subtitle, html) only renders on Select; other adopters (Radio,
     * CheckboxList, ToggleButtons, InFilter) render only description/disabled.
     *
     * @param  list<array{value: mixed, label: string, description?: string, disabled?: bool, display?: array<string, string>}>  $options
     */
    public function options(array $options): static
    {
        return $this->set('options', self::normalizeOptionValues($options));
    }
}
