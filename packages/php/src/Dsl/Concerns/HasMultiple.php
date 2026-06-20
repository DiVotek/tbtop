<?php

namespace Tbtop\Admin\Dsl\Concerns;

/**
 * Shared multi-select toggle for fields that allow more than one value
 * (Select, ToggleButtons). The flag is serialized as options.multiple;
 * isMultiple() reads it back for server-side rule walking.
 *
 * Adopters get the Field base, which supplies set() + the opts bag.
 */
trait HasMultiple
{
    /** Allow selecting more than one value. */
    public function multiple(bool $value = true): static
    {
        return $this->set('multiple', $value);
    }

    public function isMultiple(): bool
    {
        return ($this->opts['multiple'] ?? false) === true;
    }
}
