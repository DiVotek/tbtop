<?php

namespace Tbtop\Admin\Dsl\Fields;

final class CheckboxList extends Field
{
    protected function kind(): string
    {
        return 'checkboxlist';
    }

    /** @param  list<array{value: mixed, label: string}>  $options */
    public function options(array $options): static
    {
        return $this->set('options', self::normalizeOptionValues($options));
    }
}
