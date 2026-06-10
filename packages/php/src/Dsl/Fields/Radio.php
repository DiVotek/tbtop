<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Radio extends Field
{
    protected function kind(): string
    {
        return 'radio';
    }

    /** @param  list<array{value: string, label: string}>  $options */
    public function options(array $options): static
    {
        return $this->set('options', $options);
    }
}
