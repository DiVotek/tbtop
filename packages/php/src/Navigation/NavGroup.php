<?php

namespace Tbtop\Admin\Navigation;

use Tbtop\Admin\Dsl\Concerns\HasIcon;

/**
 * Panel-level metadata for a sidebar nav group. The groups themselves are
 * derived from each page's nav()['group'] label; this builder attaches an
 * icon and collapsible behavior, matched back to a group by its label.
 *
 * Reuses the shared HasIcon trait so a group icon serializes to the same
 * {name, position} wire shape as action/stat/column icons.
 */
final class NavGroup
{
    use HasIcon;

    private bool $collapsible = false;

    private bool $collapsed = false;

    private function __construct(private readonly string $label) {}

    public static function make(string $label): self
    {
        return new self($label);
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

    public function label(): string
    {
        return $this->label;
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
