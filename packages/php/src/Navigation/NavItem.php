<?php

namespace Tbtop\Admin\Navigation;

use Tbtop\Admin\Dsl\Concerns\HasIcon;
use Tbtop\Admin\Dsl\Concerns\ResolvesClosures;

/**
 * A custom nav/user-menu entry: a label plus an external or internal URL.
 * No page class, no server closure; shown to everyone unless can() names a
 * gate, which is checked per request like Page::can().
 */
final class NavItem
{
    use HasIcon;
    use ResolvesClosures;

    private string $href = '';

    private ?string $group = null;

    private ?string $section = null;

    private int $order = 0;

    private bool $newTab = false;

    /** @var string|array{0: string, 1: class-string}|null */
    private string|array|null $gate = null;

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

    /** Sidebar group heading this item is listed under (nav context only); unset = ungrouped, no heading. */
    public function group(string $group): self
    {
        $this->group = $group;

        return $this;
    }

    /**
     * Section key within its group, declared on NavGroup::sections() (nav
     * context only). Ignored for ungrouped items and in the user menu.
     */
    public function section(string $section): self
    {
        $this->section = $section;

        return $this;
    }

    /** Sort position within its group (nav context only). */
    public function sort(int $order): self
    {
        $this->order = $order;

        return $this;
    }

    /** Open url() in a new browser tab instead of navigating in place. */
    public function openUrlInNewTab(bool $condition = true): self
    {
        $this->newTab = $condition;

        return $this;
    }

    /**
     * Show the item only to users the gate allows: an ability, or an ability
     * plus the model class its policy resolves from — the same value a
     * Page::can() returns, so `->can(SomePage::can())` hides a link to a page
     * its user may not open. Null (the default) shows it to everyone.
     *
     * @param  string|array{0: string, 1: class-string}|null  $gate
     */
    public function can(string|array|null $gate): self
    {
        $this->gate = $gate;

        return $this;
    }

    /**
     * Deprecated (removed in 1.0): use url()->openUrlInNewTab().
     *
     * @deprecated Use openUrlInNewTab().
     */
    public function newTab(bool $newTab = true): self
    {
        trigger_error(
            'NavItem::newTab() is deprecated and will be removed in 1.0. Use url()->openUrlInNewTab() instead.',
            E_USER_DEPRECATED,
        );

        return $this->openUrlInNewTab($newTab);
    }

    public function label(): string
    {
        return $this->resolveOpt($this->label);
    }

    public function getHref(): string
    {
        return $this->href;
    }

    public function getGroup(): ?string
    {
        return $this->group;
    }

    public function getSection(): ?string
    {
        return $this->section;
    }

    /** @return string|array{0: string, 1: class-string}|null */
    public function getGate(): string|array|null
    {
        return $this->gate;
    }

    public function getOrder(): int
    {
        return $this->order;
    }

    /**
     * Sparse link payload: label/href always; icon/newTab only when set.
     * Shared by nav items and user-menu items — group/section/order are nav-only
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
