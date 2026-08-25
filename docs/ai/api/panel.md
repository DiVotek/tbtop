<!-- GENERATED — do not edit by hand.
     Source: docblocks in packages/php/src. Regenerate with:
     cd packages/php && UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference -->

# Panel, navigation and command palette

> Back to [the AI guide](../README.md). Prose, gotchas and worked examples live in
> the hand-written docs; this page is the exhaustive method list.

Panel-level configuration: routing, appearance, navigation, chrome and the command palette.

## PanelConfig

`Tbtop\Admin\Panels\PanelConfig`

| Method | What it does |
|---|---|
| `authStack(): array` | The panel's auth/app middleware layer a page spreads to add to it, e.g. middleware(PanelConfig $p): array { return [...$p->authStack(), 'can:x']; }. Excludes SetCurrentPanel/SetAdminLocale — the route layer always applies those. |
| `brand(string $brand): static` | Brand name shown in the chrome (sidebar/topbar header). |
| `breadcrumbs(bool $enabled = true): static` | Whether pages build and send the breadcrumbs prop. |
| `chrome(string $chrome): static` | Class-string of a Chrome subclass that authors the shell (header/sidebar/ footer). Override headerItems()/sidebarItems() and spread the parent to append to the stock shell; override header()/sidebar()/footer() to replace an area outright. |
| `commandPalette(Closure\|bool $config = true): static` | Enable (default), disable with false, or configure the ⌘K command palette via a closure. The closure receives the CommandPaletteConfig to mutate (->commands([Command::make(...)...])) and returns nothing. |
| `darkMode(bool $enabled = true): static` | Allow or disable the dark-mode toggle entirely (default: allowed). |
| `defaultLocale(string $locale): static` | Default admin UI locale, overriding the first entry of locales(). |
| `defaultThemeMode(string $mode): static` | Initial theme when the visitor has no saved preference. |
| `density(string $mode): static` | Shell density: 'compact' tightens control heights, spacing, and the sidebar width. |
| `guard(string $guard): static` | Auth guard checked by authStack(). Defaults to 'web'. |
| `id(string $id): static` | Feeds the route-name namespace (`tbtop.{id}.*`) — changing it on an existing panel renames every route. |
| `locales(array $locales): static` | Admin UI locales. First entry is the default unless defaultLocale() is set. |
| `maxContentWidth(string $width): static` | Center page content to a Tailwind max-w token (e.g. '7xl'). |
| `middleware(array $middleware): static` | Replaces the default `['web']` app-middleware stack rather than appending to it; authStack() adds `auth:{guard}` on top at read time. |
| `navigation(string $navigation): static` | Shell navigation layout: 'sidebar' (default), 'topbar', or 'topbar-sidebar' (full-width bar with a sidebar beneath it). The client renders the same chrome blocks; only their arrangement changes. All layouts collapse to a burger drawer on mobile. |
| `navigationGroups(array $groups): static` | Per-group nav metadata as a list of NavGroup::make('Content')->icon('file-text') ->collapsible(), matched to a page's nav()['group'] by that label. |
| `navigationItems(array $items): static` | Extra always-shown nav entries with no page/gate (e.g. an external link), merged into the built tree alongside page-derived items, grouped by label the same way navigationGroups() matches groups. |
| `notificationsPolling(?int $seconds): static` | Seconds between header-bell polls for new notifications. null disables auto-polling (the bell still fetches when opened). Mirrors Filament's databaseNotificationsPolling(); only active when the chrome renders a notifications bell. |
| `pages(array $pages): static` | Page classes that get routes registered for this panel. |
| `prefix(string $prefix): static` | URL path prefix the panel is mounted under. Defaults to the panel id when unset — see getPrefix(). |
| `rootView(string $view): static` | Blade root view rendered on first visit (per-panel Vite entry escape hatch). |
| `unsavedGuard(bool $enabled = true): static` | Default for the unsaved-changes navigation guard on forms. |
| `userMenuItems(array $items): static` | Custom profile-dropdown entries rendered alongside the fixed theme/locale/logout controls. Link-only (label/icon/href/newTab) — chrome trees are page-independent (no per-request endpoint for a server closure to resolve against), same constraint as NotificationAction. |

## Chrome

`Tbtop\Admin\Panels\Chrome`

| Method | What it does |
|---|---|
| `footer(S $s): ?Node` | No footer in the stock shell. |
| `header(S $s): ?Node` | Topbar content. The shell right-aligns it; align: center keeps items of differing heights on one axis instead of stretching to the tallest. |
| `sidebar(S $s): ?Node` | Sidebar content: logo on top, nav groups below. |

## NavGroup

`Tbtop\Admin\Navigation\NavGroup`

| Method | What it does |
|---|---|
| `collapsed(bool $collapsed = true): self` | Start the group collapsed (implies collapsible). |
| `collapsible(bool $collapsible = true): self` | Render the group header as a collapse toggle. |
| `icon(string $name, string $position = 'left'): static` | $name is a kebab-case Lucide icon name (e.g. 'circle-check') resolved against the client's icon registry; register custom names client-side via registerIcon before using them here. $position is 'left' (default) or 'right', placing the icon relative to the label. |
| `label(Closure\|string $label): self` | Translated header text shown in the sidebar. Pass a Closure to defer translation to request time — panel config is built once (singleton), so a bare __() there would freeze on the first request's locale. |

## NavItem

`Tbtop\Admin\Navigation\NavItem`

| Method | What it does |
|---|---|
| `group(string $group): self` | Sidebar group heading this item is listed under (nav context only). |
| `icon(string $name, string $position = 'left'): static` | $name is a kebab-case Lucide icon name (e.g. 'circle-check') resolved against the client's icon registry; register custom names client-side via registerIcon before using them here. $position is 'left' (default) or 'right', placing the icon relative to the label. |
| `newTab(bool $newTab = true): self` | Open url() in a new browser tab instead of navigating in place. |
| `sort(int $order): self` | Sort position within its group (nav context only). |
| `url(string $url): self` | Destination URL — an internal path or an external link. |

## CommandPaletteConfig

`Tbtop\Admin\CommandPalette\CommandPaletteConfig`

| Method | What it does |
|---|---|
| `commands(array $commands): static` | Replaces the custom command list; additive to includeNav()'s auto-listed sidebar destinations, not a substitute for it. |
| `disable(): static` | Sugar for enable(false); a disabled palette is omitted from the wire entirely. |
| `enable(bool $enabled = true): static` | Palette is enabled by default; pass false to disable it (same as disable()). |
| `hotkey(string $spec): static` | Keybinding that opens the palette (default ⌘K / Ctrl+K). |
| `includeNav(bool $include = true): static` | Auto-list sidebar destinations (default true). false = commands only. |
| `placeholder(string $text): static` | Placeholder text for the palette search input. |

## Command

`Tbtop\Admin\CommandPalette\Command`

| Method | What it does |
|---|---|
| `group(string $group): self` | Group heading the command is listed under. |
| `handler(string $name): self` | Run a client handler registered via definePaletteCommand() instead of navigating. |
| `icon(string $name, string $position = 'left'): static` | $name is a kebab-case Lucide icon name (e.g. 'circle-check') resolved against the client's icon registry; register custom names client-side via registerIcon before using them here. $position is 'left' (default) or 'right', placing the icon relative to the label. |
| `keywords(array $keywords): self` | Extra search terms beyond the label. |
| `openInNewTab(bool $newTab = true): self` | Open url() in a new browser tab instead of navigating in place. No effect when handler() is used instead of url(). |
| `url(string $url): self` | Navigate to a URL — an internal path (Inertia visit) or an external link. |
