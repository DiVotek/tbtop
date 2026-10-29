# Backlog

> The open-work list for this repo. Items get built when a real consumer (EasyCar
> first) or adoption pain demands them. Last revised: 2026-10-29 (after 0.7.3).
>
> **This file lags the code.** Shipped items are removed in periodic sweeps (git history
> keeps them), so never conclude a feature is missing from this file alone. The source of
> truth for what exists is `docs/ai/api/` (generated) and the code itself.

## Planned for 0.8.0

- **Drop Laravel 11** — `illuminate/contracts` still allows `^11.0`. Breaking. CI keeps
  testing one cell (latest PHP × latest Laravel); no version matrix for now.
- **`displayHtml()` sanitized by default** — `S::displayHtml()` renders its string as-is
  ("the author owns escaping"). Sanitize by default, keep raw output behind an explicit
  opt-in. Breaking.
- **Semver and deprecation policy + changelog** — write the policy down and generate the
  release notes with git-cliff (no `cliff.toml` yet).
- **Email verification in the auth scaffold** — `admin:install --auth` publishes sign-in,
  password reset and the profile page, but no verification flow. `ProfilePage` already
  un-verifies a changed email on a `MustVerifyEmail` user; the notice/verify pages are
  missing.

## Small fixes

Each fits the minor-fix loop: one change, one test.

- **`simplePagination()` docblock** — says the footer shows "only previous/next"; it
  also shows "Page N" and the per-page selector (`TableBuilder.php`). The next
  `ApiReference` regeneration picks the wording up.
- **Slug transliteration gaps** — `LATIN_MAP` in `packages/client/src/fields/slugify.ts`
  covers ł đ ø ß æ œ; ı ð þ ħ still fold to dashes.

## Tables

- **Collapsible row groups** — `rowGroups.tsx` renders group headers without a
  collapse toggle.
- Filter chips, saved filters.
- **Sidebar filter placement** — `filtersIn()` is `modal|inline` (validated). A left
  sidebar variant needs the filter panel outside the toolbar row: a two-column shell in
  `tableBlock`, collapsing to `modal` under `md`. Wanted for attribute filters on catalog
  tables (ecom).
- **`Column::moneyInput()` / minor-units editing** — inline editing ships as
  `numberInput()->step(...)->suffix(...)` over the raw stored value. If a consumer stores
  minor units, the framework would own ÷100 on projection and ×100 before `onSave`,
  mirroring `KindFormat`. Not needed while consumers store decimals.
- CSV export / import (queued).

## Fields / forms

- **Declarative autofill (`S::autofill`)** — third typed consumer of deps-driven
  server-computed field data (after liveRegion → display nodes, disabledRanges → widget
  params; here → field values): `autofill('car_defaults')->dependsOn('car_id')->fill(fn)`.
  Invisible form node, endpoint binding like liveRegion. Overwrite policy: fill non-dirty
  fields only (untouched saved values do update on dep change), `force()` overwrites
  always. Until promoted, click-driven cases go through custom client handlers
  (`ctx.form.set`).
- **Collection deps for liveRegion** (`options.*.price` / whole-repeater deps) — lets a
  region re-render from unsaved repeater rows with server-side logic as the single truth.
  Wide contract change: deps payload widens from `Record<string, string>` to structured
  values on both sides (`readDeps`, `DependencyPayload`, `filterDeps`, schema), needs
  debounce (missing even for scalar text deps), costs a round-trip per row edit. Promote
  when a consumer needs *server* rules over rows; pure client math is covered by
  form-aware custom blocks (`useNearestFormController` export).
- **Dynamic form schema (fields inside liveRegion)** — lift the display-only invariant so
  region content may declare fields. Livewire-class feature: submit path must re-run
  region closures with submitted deps to collect the real rules (validation is the
  security boundary), form state needs appear/disappear semantics, region swap must
  reconcile by field name instead of remounting. Park until a consumer need survives
  contact with `hiddenIf` + deps-driven field data (which cover the known cases).
- **`Field::format()` for typed date entry** — date/daterange accept typed input in the
  admin locale's numeric format (derived from `Intl.formatToParts`), with ISO `Y-m-d`
  always accepted as a paste fallback. A `format()` on the field would let a consumer
  override that per field. Wire-grammar change: PHP builder + schema + kitchen-sink in one
  step, plus a client parser for PHP date tokens (`d/m/Y`), which does not exist — the
  existing `format()` on `Column`/`DisplayValue` is server-applied by `KindFormat` and
  never reaches the client. Promote when a consumer needs a format the locale does not give.

## Display / layout

- **Conditions outside forms** — `structureRenderer` evaluates `hiddenIf`/`disabledIf`
  against an empty context on non-form surfaces, so a condition on a page-level layout
  node never fires (static `hidden: true` works). Needs a page-level condition context
  (record + user) before conditions are promised outside forms.

## Modal

- **Footer actions slot** — `ModalShell` supports a sticky footer (every built-in dialog
  uses it) but the DSL modal renders one body only; an `actionsRow` at the end of the body
  scrolls with the content. Design: `ActionBuilder::footer([...])` → `spec.footer`, the
  footer must render inside `ModalProvider`/`ModalDataProvider`. Promote when a consumer
  hits the short-viewport case again.

## DX

- **Consumer testing kit** — Pest/PHPUnit helpers for host apps to test their own pages
  through the wire contract, e.g. `page(CarsPage::class)->assertColumn('vin')
  ->callAction('delete', $car)->assertEffect('refreshTable')`, plus `--tests` output of
  `make:tbtop-resource` built on it.

## Auth

The host owns authentication; `admin:install --auth` publishes sign-in, password reset
and the profile page as empty subclasses of the package base pages
(`Tbtop\Admin\Auth\*`); `--2fa` adds TOTP two-factor sign-in. Open:

- **`--auth` on a second panel** — the scaffold always writes `app/Admin/Pages/Auth`, so a
  second `--panel=` run reports "Exists" and does nothing, and its discovery hint would pull
  the first panel's pages in. Per-panel target dir/namespace, or refuse with a manual step.
- **Forgot-password timing** (deferred) — the reset mail is sent inline, so an existing
  account answers slower than an unknown one. Breeze has the same gap; `Timebox` or a
  queued notification closes it if a consumer asks.
- Registration, passkeys.

## Platform

- **Broadcast notifications** — the database notifications bell refreshes by polling
  (`PanelConfig::notificationsPolling()`); no broadcasting channel yet.
- **MCP tokens in the demo** — the demo panel guards MCP with
  `auth:sanctum` + `abilities:tbtop-mcp`, but `ApiTokensPage` is a placeholder: there is
  no UI that issues such a token.
- **Lexical dark mode, visual check** — the richtext theme in `core.css` uses only colour
  tokens, but nobody has looked at the editor in the dark theme yet.
- Multi-tenancy (post-panels; panels ≠ tenancy).
- **Cross-model record search** — the ⌘K palette searches nav items plus declared
  commands (`CommandPaletteConfig::commands()`); what is missing is searching *records*
  across models from one box. Needs a layout-slot design session.
- **Log viewer** — separate package: pretty log browser inside the admin, so nobody
  tails files over SSH. Not urgent.
