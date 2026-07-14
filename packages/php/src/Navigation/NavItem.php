<?php

namespace Tbtop\Admin\Navigation;

use Tbtop\Admin\Dsl\Concerns\HasIcon;

/**
 * A custom nav/user-menu entry: a label plus an external or internal URL.
 * No page class, no server closure — always shown, no per-request gate.
 */
final class NavItem
{
    use HasIcon;

    private string $href = '';

    private ?string $group = null;

    private int $order = 0;

    private bool $newTab = false;

    /** @param string|(\Closure(): string) $label */
    private function __construct(private readonly string|\Closure $label) {}

    /**
     * Pass a Closure to defer translation to request time — panel
     * config is built once at boot, so a bare __() would freeze
     * on the boot locale (same contract as NavGroup::label()).
     *
     * @param  string|(\Closure(): string)  $label
     */
    public static function make(string|\Closure $label): self
    {
        return new self($label);
    }

    /** Destination URL — an internal path or an external link. */
    public function url(string $url): self
    {
        $this->href = $url;

        return $this;
    }

    /** Sidebar group heading this item is listed under (nav context only). */
    public function group(string $group): self
    {
        $this->group = $group;

        return $this;
    }

    /** Sort position within its group (nav context only). */
    public function sort(int $order): self
    {
        $this->order = $order;

        return $this;
    }

    public function newTab(bool $newTab = true): self
    {
        $this->newTab = $newTab;

        return $this;
    }

    public function label(): string
    {
        return $this->label instanceof \Closure ? ($this->label)() : $this->label;
    }

    public function getHref(): string
    {
        return $this->href;
    }

    public function getGroup(): ?string
    {
        return $this->group;
    }

    public function getOrder(): int
    {
        return $this->order;
    }

    /**
     * Sparse link payload: label/href always; icon/newTab only when set.
     * Shared by nav items and user-menu items — group/order are nav-only
     * placement concerns the caller applies separately.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $out = ['label' => $this->label(), 'href' => $this->href];
        $out += $this->iconOption();
        if ($this->newTab) {
            $out['newTab'] = true;
        }

        return $out;
    }
}
