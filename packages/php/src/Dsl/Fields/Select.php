<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Select extends Field
{
    protected function kind(): string
    {
        return 'select';
    }

    /** @param  list<array{value: string, label: string}>  $options */
    public function options(array $options): static
    {
        return $this->set('options', $options);
    }

    public function searchable(bool $value = true): static
    {
        return $this->set('searchable', $value);
    }

    /** Provide an Eloquent query for dynamic options. */
    public function query(callable $callback): static
    {
        return $this->set('query', $callback);
    }
}
