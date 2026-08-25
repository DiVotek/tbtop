# Building Admin Pages on Tabletop — AI Guide

> This is the authoring guide for an AI agent (or a developer) building admin pages on
> the `tbtop/admin` (PHP) + `@tbtop/inertia-admin` (React) stack. It is reference
> material: short, lookup-shaped, and verified against source. Read the doc that matches
> your task; you do not need to read all four front-to-back.

> **No installation section yet — deliberate.** The packages aren't published (composer +
> npm release lands in roadmap 1.3). These docs cover building *on* the framework inside this
> repo, where it's already wired. A quickstart/install guide is a Phase-2 concern, gated on
> the real release.

## What you are building on

A consumer writes admin pages in a **PHP DSL** (the `S` builder, Filament-shaped). Pages
serialize to JSON and ship as Inertia props. A **React client** interprets the JSON and
renders it. Laravel owns the backend (auth, validation, queues, migrations, money casts).
**Three boundaries, and they are the whole architecture:**

- **The DSL owns page composition** — what fields, tables, actions, and layout a page has.
- **The client owns rendering** — how those compose on screen, and all interactivity.
- **Laravel owns the backend** — security, persistence, jobs. The DSL does not reinvent it.

No Livewire. Validation is always PHP (the client's zod mirror is on-blur UX only, never
trusted).

## The one decision that matters: where does my code go?

A two-language stack means the most expensive mistake is putting logic on the wrong side.
Place it before you write it:

| You're adding… | It goes in… | Why |
|---|---|---|
| A new page, table, form, action | PHP DSL in the consumer app's `Admin/Pages/` | Pages are authored in PHP, per request |
| A new field **type** | **all three:** a PHP builder + a React component + a schema entry | A field is a builder + a component + a grammar entry. Two of three is a broken wire. See [./fields.md](./fields.md) and [./wiring.md](./wiring.md) |
| Validation | PHP (Laravel rules) — always | PHP is the security boundary |
| Backend behavior (queue, job, notification, auth, DB) | Plain Laravel in the consumer app | Laravel owns the backend |
| Rendering / interactivity | The React client | The client owns the screen |
| A new effect | **Don't — the set is closed.** Use a `custom` client handler or a server redirect | The effect set (`notify/redirect/refreshTable/resetForm/closeModal/haltModal/copyToClipboard/setFormData`) is fixed. See [./authoring-pages.md](./authoring-pages.md) |
| An app-specific field, without touching core | The client registry (`registerBlock`) + a PHP class in your app | See the custom-field section in [./wiring.md](./wiring.md) |

If you can't place it from this table, **ask** — don't guess.

## Before you build: check it doesn't already exist

Weak instinct: reinvent what's there. The framework is broad. Before adding anything:

- **26 field kinds exist** (25 fields + the `in` filter) — text, textarea, password, otp,
  number, date, datetime, time, daterange, boolean, checkbox, checkboxlist, radio,
  togglebuttons, slider, select (static / searchable / async / creatable / multiple), tags,
  colorpicker, keyvalue, slug, upload, media, relation, repeater, richtext, plus the `in`
  filter. Prose in [./fields.md](./fields.md); the exhaustive method list, generated from
  source, in [./api/fields.md](./api/fields.md). Confirm there **first**.
- **Layout & display, tables, actions** — stack/row/flex/grid/section/collapsible/aside,
  display blocks (incl. the displayValue/Image/Richtext/KeyValue read-only family), tabs,
  action groups; tables with sort/pagination/global + per-column search/filters/tabs/
  grouping/drag-reorder/inline-editable cells/row+bulk+header actions; the closed effect set.
  Concepts in [./authoring-pages.md](./authoring-pages.md), full method lists in [./api/](./api/).
- **Panel-level features are easy to miss** — multi-panel, navigation, chrome-as-DSL, the
  command palette, database notifications, appearance and locales all live on `PanelConfig`.
  See [./api/panel.md](./api/panel.md) and [Recipe 8/9](./recipes.md).
- **Many "missing" Filament features compose from existing primitives** — relation
  managers (multiple tables on a page), read-only detail (display blocks), soft-delete
  (the `->softDeletes()` macro). Check [./recipes.md](./recipes.md) before concluding a
  feature is absent.

## How these docs are split

**Prose explains; the generated reference enumerates.** Reach for the reference when you
need "does this method exist and what does it take"; reach for the prose when you need
"how do I compose this, and what will bite me".

### Hand-written — concepts, gotchas, worked examples

1. **[authoring-pages.md](./authoring-pages.md)** — the PHP side. The `Page` class, the `S`
   builder catalog, layout blocks (their option vocabulary lives here, not in the generated
   reference), the closed effect set, and the action handler context. **Start here to build
   a page.**
2. **[fields.md](./fields.md)** — how fields behave: the select progression
   (static → searchable → async → creatable), rich options, the upload cookbook,
   translatable fields, dependent/cascading fields. **Read before building any field.**
3. **[wiring.md](./wiring.md)** — how the two sides join: the HTTP endpoint inventory, the
   Inertia-vs-plain-JSON transport rule (the #1 wiring mistake), the contract gate, and the
   client extension API. **Read when adding a field kind, an endpoint, or a custom block.**
4. **[recipes.md](./recipes.md)** — compositions indexed by intent: how to build the thing
   you think is missing out of parts that exist. **Read before concluding a feature needs
   new framework code.**

### Generated — the exhaustive method lists

Built from PHP docblocks by `ApiReferenceTest`, so they cannot drift from the code.
**Never hand-edit them**; fix the docblock and regenerate with
`UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference` (from `packages/php/`).

| File | Covers |
|---|---|
| [api/builder.md](./api/builder.md) | The `S` builder — layout, display, chrome and data-builder factories |
| [api/fields.md](./api/fields.md) | Base methods shared by every field, then each field kind + the concerns it composes (validation helpers, dependencies, options, affixes) |
| [api/tables.md](./api/tables.md) | `TableBuilder`, `Column`, `Tab` |
| [api/actions.md](./api/actions.md) | `ActionBuilder`, `Effects`, `FormBuilder` |
| [api/panel.md](./api/panel.md) | `PanelConfig`, `Chrome`, nav, command palette |
| [api/blocks.md](./api/blocks.md) | Display blocks, `Stat`, `ChartBuilder`, `ListBuilder`, `LiveRegionBuilder` |
| [api/notifications.md](./api/notifications.md) | `Notification`, `NotificationAction` |

## Ground rules for every page

- **The demo is the reference corpus.** `apps/demo/app/Admin/Pages/` is real, working DSL
  usage. When in doubt about a pattern, read it there rather than inventing one. These docs
  quote it throughout.
- **Validation lives in PHP.** Every rule is a Laravel rule on the field; the client mirror
  is UX only.
- **A new field or block kind touches the contract** — PHP builder + schema + client
  component in the **same change**, then run the contract tests. See [./wiring.md](./wiring.md).
- **The effect set is closed.** Need behavior outside it → `custom` handler or server
  redirect, not a new effect.

> **Trust order when sources disagree.** `docs/ai/api/` is generated from source, so its
> **signatures** cannot lag — it wins on "does this method exist and what does it take".
> Its *descriptions* are only as true as the docblock they came from, and a docblock
> describing **client** behavior is unverified prose like any other: when a claim about
> rendering matters, check `packages/client/src/`. These prose files are hand-maintained
> and source-verified; `CLAUDE.md` is the contributor guide and lags more easily.
> `docs/roadmap.md` and `docs/backlog.md` lag furthest — they list shipped features as
> pending, so never conclude a feature is missing from them alone.
