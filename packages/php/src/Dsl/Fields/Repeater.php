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

    /**
     * Render each row collapsed to a one-line summary; click to expand the
     * edit form. Off by default — existing repeaters stay fully expanded.
     */
    public function collapsible(bool $collapsible = true): static
    {
        return $this->set('collapsible', $collapsible);
    }

    /**
     * Sub-field name whose value fills the collapsed row's title
     * (e.g. 'label'). Only read when collapsible.
     */
    public function summary(string $field): static
    {
        return $this->set('summary', $field);
    }
}
