<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Repeater extends Field
{
    protected function kind(): string
    {
        return 'repeater';
    }

    /**
     * Child fields making up one row. May contain another repeater to nest —
     * validation rules prefix through every level as `x.*.child.*.field`.
     *
     * @param  list<Field>  $fields
     */
    public function fields(array $fields): static
    {
        return $this->set('fields', $fields);
    }

    /** Client-enforced cap on row count (disables "Add row" at the limit). Not re-checked server-side — a direct request can still submit more rows. */
    public function maxItems(int $max): static
    {
        return $this->set('maxItems', $max);
    }

    /** Client-enforced floor on row count (disables row removal at the limit). Not re-checked server-side. */
    public function minItems(int $min): static
    {
        return $this->set('minItems', $min);
    }

    /**
     * Row count RecordDefaults pads the seeded record up to, but only when
     * the repeater's key is absent from the record entirely — it never
     * trims or tops up an explicitly supplied value. Rows beyond any
     * default() content are created empty, so a repeater can ship pre-filled
     * rows plus blank ones as a prompt.
     */
    public function defaultItems(int $count): static
    {
        return $this->set('defaultItems', $count);
    }

    public function defaultItemCount(): int
    {
        $count = $this->opts['defaultItems'] ?? 0;

        return is_int($count) ? $count : 0;
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
