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
  ids. Reorder disabled while sort/filters active (Filament behavior). **Deferred** — no
  architecture impact.
- Sticky table header, filter chips, saved filters, per-column search.
- CSV export / import (queued), soft-delete macro (trashed filter + restore/force).

## Fields / forms

- **helperText + tooltip** — `Field::helperText()` (muted text under the field) +
  `Field::tooltip()` (info icon near the label, Radix Tooltip). Wire: field options +
  schema + field chrome in `formBlock`.
- Infolist / read-only detail view.

## Display / layout

- **`S::markdown($md)`** — server-side `Str::markdown()` (league/commonmark ships with
  Laravel) → emits the existing `displayHtml` wire node. Zero client code, zero schema
  change.
- **Flex options on `row`/`stack`** — `->justify(...)`, `->align(...)`, `->gap(n)`,
  `->wrap()`. No new block kind: both blocks are already flex containers.

## Modal

- Fix open animation — appears from the left; broken center positioning in revola classes.
- Hide scrollbar on the scrollable body (shadcn dialog parity).
- Expose `size` on `ActionBuilder::modal()` — client `ModalShell` already supports
  `sm/md/lg/full`.
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

- Media v2 ideas — TBD (carried from pre-extraction backlog).
