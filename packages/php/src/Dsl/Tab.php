<?php

namespace Tbtop\Admin\Dsl;

use Tbtop\Admin\Dsl\Concerns\HasIcon;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\Concerns\HasTooltip;

/**
 * Predefined table tab — a named server-side query scope rendered as a tab
 * bar above the table toolbar. The query closure never serializes; it is
 * re-resolved per request from the page tree, same as filterUsing() closures.
 */
final class Tab
{
    use HasIcon;
    use HasServerQuery;
    use HasTooltip;

    private ?string $label = null;

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

    /** Opt into a count badge for this tab (off by default). */
    public function count(bool $count = true): self
    {
        $this->count = $count;

        return $this;
    }

    public function hasCount(): bool
    {
        return $this->count;
    }

    /** Wire shape for table node options. Label falls back to the name. */
    public function toWire(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label ?? $this->name,
            'count' => $this->count,
            ...$this->iconOption(),
            ...$this->tooltipOption(),
        ];
    }
}
