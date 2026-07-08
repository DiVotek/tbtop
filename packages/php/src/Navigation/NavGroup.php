<?php

namespace Tbtop\Admin\Navigation;

use Tbtop\Admin\Dsl\Concerns\HasIcon;

/**
 * Panel-level metadata for a sidebar nav group. Groups are keyed by the
 * stable, unlocalized string a page's nav()['group'] returns; this builder
 * matches by that key and attaches an icon, collapse behavior, and an
 * optional translated display label. Keying by a stable key (not the label)
 * keeps ordering and meta intact when the label is translated.
 *
 * Reuses the shared HasIcon trait so a group icon serializes to the same
 * {name, position} wire shape as action/stat/column icons.
 */
final class NavGroup
{
    use HasIcon;

    private bool $collapsible = false;

    private bool $collapsed = false;

    /** @var string|(\Closure(): string)|null */
    private string|\Closure|null $label = null;

    private function __construct(private readonly string $key) {}

    public static function make(string $key): self
    {
        return new self($key);
    }

    /**
     * Translated header text shown in the sidebar. Pass a Closure to defer
     * translation to request time — panel config is built once (singleton),
     * so a bare __() there would freeze on the first request's locale.
     *
     * @param  string|(\Closure(): string)  $label
     */
    public function label(string|\Closure $label): self
    {
        $this->label = $label;

        return $this;
    }

    /** Render the group header as a collapse toggle. */
    public function collapsible(bool $collapsible = true): self
    {
        $this->collapsible = $collapsible;

        return $this;
    }

    /** Start the group collapsed (implies collapsible). */
    public function collapsed(bool $collapsed = true): self
    {
        $this->collapsed = $collapsed;
        if ($collapsed) {
            $this->collapsible = true;
        }

        return $this;
    }

    /** The stable, unlocalized key pages match against. */
    public function key(): string
    {
        return $this->key;
    }

    /** The display text, falling back to the key when none was set. */
    public function displayLabel(): string
    {
        if ($this->label instanceof \Closure) {
            return ($this->label)();
        }

        return $this->label ?? $this->key;
    }

    /**
     * Sparse wire meta merged into the built group: icon/collapsible/collapsed,
     * each present only when set.
     *
     * @return array<string, mixed>
     */
    public function meta(): array
    {
        $meta = $this->iconOption();
        if ($this->collapsible) {
            $meta['collapsible'] = true;
        }
        if ($this->collapsed) {
            $meta['collapsed'] = true;
        }

        return $meta;
    }
}
