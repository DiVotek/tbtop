<?php

namespace Tbtop\Admin\Dsl\Fields;

final class ToggleButtons extends Field
{
    protected function kind(): string
    {
        return 'togglebuttons';
    }

    /** @param  list<array{value: mixed, label: string}>  $options */
    public function options(array $options): static
    {
        return $this->set('options', self::normalizeOptionValues($options));
    }

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
