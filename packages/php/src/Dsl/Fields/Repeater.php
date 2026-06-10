<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Repeater extends Field
{
    protected function kind(): string
    {
        return 'repeater';
    }

    /** @param  list<Field>  $fields */
    public function fields(array $fields): static
    {
        return $this->set('fields', $fields);
    }

    public function maxItems(int $max): static
    {
        return $this->set('maxItems', $max);
    }
}
