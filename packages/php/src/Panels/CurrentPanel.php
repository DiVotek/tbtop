<?php

namespace Tbtop\Admin\Panels;

use Illuminate\Container\Container;
use Tbtop\Admin\Navigation\NavGroup;
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

    /** @return 'sidebar'|'topbar' */
    public function navigation(): string
    {
        return $this->config->getNavigation();
    }

    /** Seconds between header-bell notification polls, or null to disable. */
    public function notificationsPolling(): ?int
    {
        return $this->config->getNotificationsPolling();
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

    /** @return array<string, mixed> */
    public function appearance(): array
    {
        return $this->config->appearance();
    }
}
