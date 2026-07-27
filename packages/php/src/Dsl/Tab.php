<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use Tbtop\Admin\Dsl\Concerns\HasIcon;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\Concerns\HasTooltip;
use Tbtop\Admin\Dsl\Concerns\ResolvesClosures;

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
    use ResolvesClosures;

    private string|Closure|null $label = null;

    private bool $count = false;

    private string|Closure|null $description = null;

    public function __construct(public readonly string $name) {}

    public static function make(string $name): self
    {
        return new self($name);
    }

    /** @param  string|(Closure(): string)|null  $label */
    public function label(string|Closure|null $label): self
    {
        $this->label = $label;

        return $this;
    }

    /**
     * Optional subtitle shown under the page title while this tab is active.
     *
     * @param  string|(Closure(): string)  $description
     */
    public function description(string|Closure $description): self
    {
        $this->description = $description;

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
        $label = $this->resolveOpt($this->label);

        return [
            'name' => $this->name,
            'label' => $label ?? $this->name,
            'count' => $this->count,
            ...$this->iconOption(),
            ...$this->tooltipOption(),
            ...($this->description !== null ? ['description' => $this->resolveOpt($this->description)] : []),
        ];
    }
}
