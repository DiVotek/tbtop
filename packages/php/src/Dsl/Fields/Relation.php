<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;

final class Relation extends Field
{
    /** Server-only closure for building the Eloquent query — never serialized. */
    private ?Closure $queryClosure = null;

    protected function kind(): string
    {
        return 'relation';
    }

    /** Provide an Eloquent query builder for the related records. */
    public function query(callable $callback): static
    {
        $this->queryClosure = Closure::fromCallable($callback);

        return $this;
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

    /** Returns the label column name (defaults to 'name' when not set). */
    public function getLabelKey(): string
    {
        return (string) ($this->opts['labelKey'] ?? 'name');
    }

    /** Returns the query closure for server-side use (never sent to the wire). */
    public function queryClosure(): ?Closure
    {
        return $this->queryClosure;
    }
}
