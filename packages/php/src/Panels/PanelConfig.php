<?php

namespace Tbtop\Admin\Panels;

use Closure;
use InvalidArgumentException;
use Tbtop\Admin\CommandPalette\CommandPaletteConfig;
use Tbtop\Admin\Navigation\NavGroup;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\Concerns\ConfiguresAppearance;

/**
 * Fluent per-panel configuration, produced by Panel::configure().
 */
final class PanelConfig
{
    use ConfiguresAppearance;

    /** Shell navigation layouts the client can render. */
    public const NAVIGATIONS = ['sidebar', 'topbar'];

    private string $id = '';

    private string $prefix = '';

    private string $guard = 'web';

    /** @var list<string> */
    private array $middleware = ['web'];

    /** @var list<class-string<Page>> */
    private array $pages = [];

    /** @var list<string> */
    private array $locales = ['en'];

    private ?string $defaultLocale = null;

    private bool $unsavedGuard = true;

    private bool $breadcrumbs = true;

    private ?string $brand = null;

    private string $navigation = 'sidebar';

    private ?int $notificationsPolling = 30;

    private ?CommandPaletteConfig $commandPalette = null;

    private string $rootView = 'app';

    /** Untyped on purpose: validated against Chrome at serialization time. @var class-string|null */
    private ?string $chrome = null;

    /** @var list<NavGroup> */
    private array $navigationGroups = [];

    public function id(string $id): static
    {
        $this->id = $id;

        return $this;
    }

    public function prefix(string $prefix): static
    {
        $this->prefix = $prefix;

        return $this;
    }

    public function guard(string $guard): static
    {
        $this->guard = $guard;

        return $this;
    }

    /** @param  list<string>  $middleware */
    public function middleware(array $middleware): static
    {
        $this->middleware = $middleware;

        return $this;
    }

    /** @param  list<class-string<Page>>  $pages */
    public function pages(array $pages): static
    {
        $this->pages = $pages;

        return $this;
    }

    /** Admin UI locales. First entry is the default unless defaultLocale() is set. @param  list<string>  $locales */
    public function locales(array $locales): static
    {
        $this->locales = $locales;

        return $this;
    }

    public function defaultLocale(string $locale): static
    {
        $this->defaultLocale = $locale;

        return $this;
    }

    /** Default for the unsaved-changes navigation guard on forms. */
    public function unsavedGuard(bool $enabled = true): static
    {
        $this->unsavedGuard = $enabled;

        return $this;
    }

    /** Whether pages build and send the breadcrumbs prop. */
    public function breadcrumbs(bool $enabled = true): static
    {
        $this->breadcrumbs = $enabled;

        return $this;
    }

    public function brand(string $brand): static
    {
        $this->brand = $brand;

        return $this;
    }

    /**
     * Shell navigation layout: 'sidebar' (default) or 'topbar'. The client
     * renders the same chrome blocks; only their arrangement changes. Both
     * layouts collapse to a burger drawer on mobile.
     *
     * @param  'sidebar'|'topbar'  $navigation
     */
    public function navigation(string $navigation): static
    {
        if (! in_array($navigation, self::NAVIGATIONS, true)) {
            throw new InvalidArgumentException(
                "Unknown navigation \"{$navigation}\". Expected one of: ".implode(', ', self::NAVIGATIONS).'.',
            );
        }
        $this->navigation = $navigation;

        return $this;
    }

    /**
     * Seconds between header-bell polls for new notifications. null disables
     * auto-polling (the bell still fetches when opened). Mirrors Filament's
     * databaseNotificationsPolling(); only active when the chrome renders a
     * notifications bell.
     */
    public function notificationsPolling(?int $seconds): static
    {
        $this->notificationsPolling = $seconds;

        return $this;
    }

    /** Enable (default), disable with false, or configure the ⌘K command palette via a closure. */
    public function commandPalette(bool|Closure $config = true): static
    {
        $palette = $this->getCommandPalette();
        if ($config instanceof Closure) {
            $palette->enable();
            $config($palette);
        } else {
            $palette->enable($config);
        }

        return $this;
    }

    /** Blade root view rendered on first visit (per-panel Vite entry escape hatch). */
    public function rootView(string $view): static
    {
        $this->rootView = $view;

        return $this;
    }

    /** Chrome class serialized into the shell areas (header/sidebar/footer DSL). @param  class-string<Chrome>  $chrome */
    public function chrome(string $chrome): static
    {
        $this->chrome = $chrome;

        return $this;
    }

    /** Per-group nav metadata (icon, collapsible), matched to a page's nav group by label. @param  list<NavGroup>  $groups */
    public function navigationGroups(array $groups): static
    {
        $this->navigationGroups = $groups;

        return $this;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getPrefix(): string
    {
        return $this->prefix !== '' ? $this->prefix : $this->id;
    }

    public function getGuard(): string
    {
        return $this->guard;
    }

    /** @return list<string> */
    public function getMiddleware(): array
    {
        return $this->middleware;
    }

    /**
     * The panel's auth/app middleware layer a page spreads to add to it, e.g.
     * middleware(PanelConfig $p): array { return [...$p->authStack(), 'can:x']; }.
     * Excludes SetCurrentPanel/SetAdminLocale — the route layer always applies those.
     *
     * @return list<string>
     */
    public function authStack(): array
    {
        return [...$this->middleware, 'auth:'.$this->guard];
    }

    /** @return list<class-string<Page>> */
    public function getPages(): array
    {
        return $this->pages;
    }

    /** @return list<string> */
    public function getLocales(): array
    {
        return $this->locales;
    }

    public function getDefaultLocale(): string
    {
        return $this->defaultLocale ?? $this->locales[0] ?? 'en';
    }

    public function hasUnsavedGuard(): bool
    {
        return $this->unsavedGuard;
    }

    public function hasBreadcrumbs(): bool
    {
        return $this->breadcrumbs;
    }

    public function getBrand(): ?string
    {
        return $this->brand;
    }

    /** @return 'sidebar'|'topbar' */
    public function getNavigation(): string
    {
        /** @var 'sidebar'|'topbar' */
        return $this->navigation;
    }

    public function getNotificationsPolling(): ?int
    {
        return $this->notificationsPolling;
    }

    public function getCommandPalette(): CommandPaletteConfig
    {
        return $this->commandPalette ??= new CommandPaletteConfig;
    }

    public function getRootView(): string
    {
        return $this->rootView;
    }

    /** @return class-string|null */
    public function getChrome(): ?string
    {
        return $this->chrome;
    }

    /** @return list<NavGroup> */
    public function getNavigationGroups(): array
    {
        return $this->navigationGroups;
    }
}
