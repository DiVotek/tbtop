<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Relation extends Field
{
    protected function kind(): string
    {
        return 'relation';
    }

    /** Provide an Eloquent query for the related records. */
    public function query(callable $callback): static
    {
        return $this->set('query', $callback);
    }

    public function searchable(bool $value = true): static
    {
        return $this->set('searchable', $value);
    }

    /** Column name used as the display label in the relation picker. */
    public function labelKey(string $column): static
    {
        return $this->set('labelKey', $column);
    }
}
