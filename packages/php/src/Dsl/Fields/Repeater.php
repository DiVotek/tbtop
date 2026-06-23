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

    public function minItems(int $min): static
    {
        return $this->set('minItems', $min);
    }

    public function defaultItems(int $count): static
    {
        return $this->set('defaultItems', $count);
    }
}
