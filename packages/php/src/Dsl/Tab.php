<?php

namespace Tbtop\Admin\Dsl;

use Closure;

/**
 * Predefined table tab — a named server-side query scope rendered as a tab
 * bar above the table toolbar. The query closure never serializes; it is
 * re-resolved per request from the page tree, same as filterUsing() closures.
 */
final class Tab
{
    private ?string $label = null;

    private ?Closure $query = null;

    private bool $count = false;

    public function __construct(public readonly string $name) {}

    public static function make(string $name): self
    {
        return new self($name);
    }

    public function label(?string $label): self
    {
        $this->label = $label;

        return $this;
    }

    /** Scope applied to the table query when this tab is active. */
    public function query(Closure $query): self
    {
        $this->query = $query;

        return $this;
    }

    /** Opt into a count badge for this tab (off by default). */
    public function count(bool $count = true): self
    {
        $this->count = $count;

        return $this;
    }

    public function queryClosure(): ?Closure
    {
        return $this->query;
    }

    public function hasCount(): bool
    {
        return $this->count;
    }

    /**
     * Wire shape for table node options. Label falls back to the name.
     *
     * @return array{name: string, label: string, count: bool}
     */
    public function toWire(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label ?? $this->name,
            'count' => $this->count,
        ];
    }
}
