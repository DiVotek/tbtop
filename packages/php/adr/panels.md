---
domain: panels
---

# Panels (multi-admin), page layouts, chrome

## Decisions

- **Panel = plain class, not a ServiceProvider.** Consumer extends `Panel`, implements
  `configure(PanelConfig $p): PanelConfig` — id, prefix, guard, middleware, pages, UI
  locales, chrome, brand, rootView. Registered via `config('tbtop-admin.panels') =>
  [AdminPanel::class, ...]`. A provider wrapper can be layered later if boot hooks are
  ever needed.
- **Clean break from flat config.** Legacy keys (`pages`, `prefix`, `middleware`,
  `locales`, `default_locale`, `unsaved_guard`, `breadcrumbs`) move into `PanelConfig`.
  Config keeps only: `panels`, global `media`, `content_locales`. No compat shim — zero
  consumers at decision time.
- **Route names gain a panel segment**: `tbtop.{panel}.{slug}` (+ `.form` / `.action` /
  `.table` / `.data` / `.selectCreate`). Media/upload/locale routes register under every
  panel's prefix, so the panel's guard applies to them automatically.
- **Current panel is request-scoped.** Route-group middleware `SetCurrentPanel:{id}`
  binds a `CurrentPanel` instance into the container. NavBuilder, LocaleService, the
  Inertia share closure, and chrome read `CurrentPanel` — never config directly.
- **Guard wiring is just `auth:{guard}`.** `Auth::shouldUse()` makes `$request->user()`
  and `Gate::authorize()` resolve against the panel's guard; `AuthorizesPage` unchanged.
- **Pages are panel-agnostic.** One Page class may be listed in several panels; nav hrefs
  build from the panel prefix. Pages never reference their panel.
- **UI locales per panel; content locales stay global** (content locales describe the
  data, not the panel).
- **Media config stays global** — shared storage; per-panel media scoping is tenancy,
  explicitly out of scope.
- **One client bundle serves all panels by default.** The interpreter is panel-agnostic;
  all panel knowledge arrives per-request via shared props (`tbtop.*`). Per-panel
  `rootView` is the escape hatch for a separate Vite entry (per-panel custom fields or
  branding). The client has no build-time config of its own — verify no hardcoded
  prefixes/route names during implementation.
- **Page layout**: `Page::layout(): string` — `'admin' | 'center'`, default `'admin'`
  (inherited; developer overrides per page). Serialized in page props; the client's
  persistent layout dispatches `AdminLayout` vs `CenterLayout` (centered, chrome-less).
  Auth pages (login/register) use `center`.
- **Chrome = per-panel plain stateless class** (instantiated at share-time, like Page —
  not a container singleton). Methods `header / sidebar / footer (S $s): Node` return DSL
  trees; defaults wrap predefined blocks in `$s->row(...)`. Default item lists are
  protected methods, so overriding = spread defaults + append own `$s->text` /
  `$s->action`. Main use case is appending (branding, custom actions), not rebuilding.
- **Predefined chrome block kinds**: `navMenu`, `userMenu`, `logo`, `localeSwitcher`,
  `spacer` — thin DSL wrappers over the existing React chrome components. New kinds enter
  schema + kitchen-sink fixture + contract tests in the same change (contract gate).
  Client React `slots` remain the last-resort escape hatch.

## Why

Single-instance assumptions (one prefix, hardcoded `['web','auth']`, global
`Inertia::share`, route names without a panel segment) are cheap to break now and
expensive after EasyCar consumes the package. Class-based panels keep all per-instance
configuration in one reviewable place; request-scoped resolution avoids threading a panel
argument through every builder. Chrome-as-DSL extends the product's core promise — PHP
authors the screen — to the shell itself, instead of leaving branding a React-only
exercise.
