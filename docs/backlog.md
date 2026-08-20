# Backlog

> Detail pool behind `roadmap.md`. Items promote into a roadmap phase when a real
> consumer (EasyCar first) or adoption pain demands them. Last revised: 2026-06-11.

## Tables

- **Predefined filter tabs** — `TableBuilder::tabs([Tab::make('active')->query(fn), ...])`;
  selected tab in URL state `t[table][tab]`; server resolves the tab closure by name
  (same per-request pattern as server actions). Opt-in count badges (one count query per
  tab, off by default).
- **Reorderable rows (drag-and-drop)** — `TableBuilder::reorderable('sort_order')`;
  dnd-kit (new client dep), handle column, `POST .../tables/{t}/reorder` with ordered
  ids. Reorder disabled while sort/filters active (Filament behavior). **Shipped (M-94)** —
  wire shape `reorder: {column}`, endpoint scopes ids to the table query. See
  [./ai/wiring.md](./ai/wiring.md).
- Sticky table header, filter chips, saved filters, per-column search.
- CSV export / import (queued), soft-delete macro (trashed filter + restore/force).

## Fields / forms

- **helperText + tooltip** — `Field::helperText()` (muted text under the field) +
  `Field::tooltip()` (info icon near the label, Radix Tooltip). Wire: field options +
  schema + field chrome in `formBlock`.
- Infolist / read-only detail view.
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

- **`S::markdown($md)`** — server-side `Str::markdown()` (league/commonmark ships with
  Laravel) → emits the existing `displayHtml` wire node. Zero client code, zero schema
  change.
- **Flex options on `row`/`stack`** — `->justify(...)`, `->align(...)`, `->gap(n)`,
  `->wrap()`. No new block kind: both blocks are already flex containers.

## Modal

- ~~Fix open animation — appears from the left; broken center positioning in revola
  classes.~~ Done: #106 dropped the directional slide-in/out utilities — the desktop
  dialog fades and scales in from center (`enter` keyframes carry no translate).
  DEMO-4 also wired `slideOver()`/`modalWidth()` through wire materialization
  (they were serialized but dropped client-side).
- Hide scrollbar on the scrollable body (shadcn dialog parity).
- Sticky header/footer already exist (revola) — verify only.

## DX

- **`tbtop:page` scaffold command** — artisan generator for an empty Page class
  (path/nav/view stub). The package registers zero commands today.

## Platform

- **Database notifications center** — bell in header chrome (depends on chrome-as-DSL),
  Laravel `database` channel, unread count + list + mark-read endpoints; polling first,
  broadcasting later.
- **MCP server** — `laravel/mcp`; tools generated from the page registry. Gates must
  apply. Phase 1 read-only (table queries/filters/search), phase 2 actions. Needs its own
  design session.
- **Log viewer** — separate package: pretty log browser inside the admin, so nobody
  tails files over SSH. Not urgent.
- Multi-tenancy (post-panels; panels ≠ tenancy).
- Global search (needs a layout-slot design session).
- Mobile sidebar (drawer); dark-mode completeness (recharts + Lexical theme tokens).

## Media

- **Conversion format for media-library variants** — `media.profiles` entries accept
  `format`/`quality` (webp/jpeg via `ImageEncoder`, png fallback when GD lacks the codec).
  `ImageSizes::generate()` already takes both; the open question is per-profile vs a
  global `media.conversions` default. Variants currently hardcode png.
- Media v2 ideas — TBD (carried from pre-extraction backlog).
