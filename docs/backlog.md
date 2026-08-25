# Backlog

> Detail pool behind `roadmap.md`. Items promote into a roadmap phase when a real
> consumer (EasyCar first) or adoption pain demands them. Last revised: 2026-08-24.
>
> **This file lags the code.** Shipped items are struck through as they land, but the
> sweep is manual — never conclude a feature is missing from this file alone. The
> source of truth for what exists is `docs/ai/api/` (generated) and the code itself.

## Tables

- ~~**Predefined filter tabs**~~ **Shipped** — `TableBuilder::tabs([Tab::make('active')
  ->query(fn), ...])`, URL state `t[table][tab]`, opt-in count badges via `Tab::count()`.
- **Reorderable rows (drag-and-drop)** — `TableBuilder::reorderable('sort_order')`;
  dnd-kit (new client dep), handle column, `POST .../tables/{t}/reorder` with ordered
  ids. Reorder disabled while sort/filters active (Filament behavior). **Shipped (M-94)** —
  wire shape `reorder: {column}`, endpoint scopes ids to the table query. See
  [./ai/wiring.md](./ai/wiring.md).
- Sticky table header, filter chips, saved filters.
- ~~Per-column search~~ **Shipped** — `Column::individuallySearchable()`.
- ~~Soft-delete macro~~ **Shipped** — `TableBuilder::softDeletes($s, Model::class)`.
- CSV export / import (queued).

## Fields / forms

- ~~**helperText + tooltip**~~ **Shipped** — `Field::helperText()` + `Field::tooltip()`.
- ~~Infolist / read-only detail view~~ **Shipped** — the display-value family
  (`displayValue`/`displayImage`/`displayRichtext`/`displayKeyValue`); see
  `RecordDetailPage` in the demo.
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

## Display / layout

- ~~**`S::markdown($md)`**~~ **Shipped** — server-side commonmark → `displayHtml`;
  `->allowHtml()` for trusted content only.
- ~~**Flex options on `row`/`stack`**~~ **Shipped** — `justify`/`align`/`gap`/`wrap`, plus
  `S::flex()` with a `card` variant and a `class` escape hatch.

## Modal

- ~~Fix open animation — appears from the left; broken center positioning in revola
  classes.~~ Done: #106 dropped the directional slide-in/out utilities — the desktop
  dialog fades and scales in from center (`enter` keyframes carry no translate).
  DEMO-4 also wired `slideOver()`/`modalWidth()` through wire materialization
  (they were serialized but dropped client-side).
- Hide scrollbar on the scrollable body (shadcn dialog parity).
- Sticky header/footer already exist (revola) — verify only.

## DX

- ~~**`tbtop:page` scaffold command**~~ **Shipped** — `make:tbtop-page`, alongside
  `admin:install` (publishes the host wiring).

## Platform

- ~~**Database notifications center**~~ **Shipped (polling)** — `$s->notifications()` bell,
  `Notification::make()->sendToDatabase()`, `PanelConfig::notificationsPolling()`.
  Broadcasting still open.
- **MCP server** — `laravel/mcp`; tools generated from the page registry. Gates must
  apply. Phase 1 read-only (table queries/filters/search), phase 2 actions. Needs its own
  design session.
- **Log viewer** — separate package: pretty log browser inside the admin, so nobody
  tails files over SSH. Not urgent.
- Multi-tenancy (post-panels; panels ≠ tenancy).
- Global search (needs a layout-slot design session).
- Mobile sidebar (drawer); dark-mode completeness (recharts + Lexical theme tokens).

## Media

- Media v2 ideas — TBD (carried from pre-extraction backlog).
