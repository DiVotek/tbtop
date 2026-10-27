<?php

namespace Tbtop\Admin\Panels;

use Illuminate\Container\Container;
use Tbtop\Admin\Auth\ProfilePage;
use Tbtop\Admin\Navigation\NavGroup;
use Tbtop\Admin\Navigation\NavItem;
use Tbtop\Admin\Pages\Page;

/**
 * Request-scoped view of the active panel, bound into the container by the
 * SetCurrentPanel route middleware. NavBuilder, LocaleService, the Inertia
 * share closure and chrome read this — never config directly.
 */
final class CurrentPanel
{
    public function __construct(private readonly PanelConfig $config) {}

    /** The panel bound for the current request, or null outside panel routes. */
    public static function current(): ?self
    {
        $container = Container::getInstance();

        if (! $container->bound(self::class)) {
            return null;
        }

        /** @var self */
        return $container->make(self::class);
    }

    public function id(): string
    {
        return $this->config->getId();
    }

    public function guard(): string
    {
        return $this->config->getGuard();
    }

    /** Null means the app's default broker. */
    public function passwordBroker(): ?string
    {
        return $this->config->getPasswordBroker();
    }

    /** Raw route prefix, e.g. 'admin'. */
    public function prefix(): string
    {
        return $this->config->getPrefix();
    }

    /** URL path prefix with a leading slash, e.g. '/admin'. */
    public function pathPrefix(): string
    {
        return '/'.trim($this->config->getPrefix(), '/');
    }

    /** @return list<class-string<Page>> */
    public function pages(): array
    {
        return $this->config->getPages();
    }

    /** @return list<string> */
    public function locales(): array
    {
        return $this->config->getLocales();
    }

    public function defaultLocale(): string
    {
        return $this->config->getDefaultLocale();
    }

    public function unsavedGuard(): bool
    {
        return $this->config->hasUnsavedGuard();
    }

    public function breadcrumbs(): bool
    {
        return $this->config->hasBreadcrumbs();
    }

    public function brand(): ?string
    {
        return $this->config->getBrand();
    }

    /** @return 'sidebar'|'topbar'|'topbar-sidebar'|'rail-sidebar' */
    public function navigation(): string
    {
        return $this->config->getNavigation();
    }

    /** Seconds between header-bell notification polls, or null to disable. */
    public function notificationsPolling(): ?int
    {
        return $this->config->getNotificationsPolling();
    }

    /** Sparse command-palette options for the client, or null when disabled. @return array<string, mixed>|null */
    public function commandPalette(): ?array
    {
        $palette = $this->config->getCommandPalette();

        return $palette->isEnabled() ? $palette->toArray() : null;
    }

    public function rootView(): string
    {
        return $this->config->getRootView();
    }

    /** @return class-string|null */
    public function chrome(): ?string
    {
        return $this->config->getChrome();
    }

    /** @return list<NavGroup> */
    public function navigationGroups(): array
    {
        return $this->config->getNavigationGroups();
    }

    /** @return list<NavItem> */
    public function navigationItems(): array
    {
        return $this->config->getNavigationItems();
    }

    /**
     * Sparse wire payloads for the profile-dropdown custom entries, led by the
     * panel's ProfilePage when it serves one.
     *
     * @return list<array<string, mixed>>
     */
    public function userMenuItems(): array
    {
        $items = $this->config->getUserMenuItems();
        $profile = $this->profileMenuItem();

        return array_map(static fn (NavItem $item): array => $item->toArray(), $profile === null ? $items : [$profile, ...$items]);
    }

    private function profileMenuItem(): ?NavItem
    {
        $url = ProfilePage::currentUrl();

        return $url === null ? null : NavItem::make(__('tbtop-admin::admin.auth.profile.title'))->url($url)->icon('user');
    }

    /** @return array<string, mixed> */
    public function appearance(): array
    {
        return $this->config->appearance();
    }

    /** Environment badge for the shell header, or null when hidden. @return array{label: string, color: string}|null */
    public function environmentIndicator(): ?array
    {
        return $this->config->getEnvironmentIndicator();
    }

    /** Style preset scope class for the root Blade's <html>, e.g. 'style-preset-vega'. */
    public function stylePresetClass(): string
    {
        return $this->config->getStylePresetClass();
    }
}
