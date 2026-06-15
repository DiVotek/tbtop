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
| A new effect | **Don't — the set is closed.** Use a `custom` client handler or a server redirect | The effect set (`notify/redirect/refreshTable/resetForm/closeModal`) is fixed. See [./authoring-pages.md](./authoring-pages.md) |
| An app-specific field, without touching core | The client registry (`registerBlock`) + a PHP class in your app | See the custom-field section in [./wiring.md](./wiring.md) |

If you can't place it from this table, **ask** — don't guess.

## Before you build: check it doesn't already exist

Weak instinct: reinvent what's there. The framework is broad. Before adding anything:

- **22 field-ish kinds exist** (21 fields + the `in` filter) — text, textarea, password,
  number, date, datetime, daterange, boolean, checkbox, radio, select (static / async /
  creatable), tags, colorpicker, keyvalue, slug, upload, media, relation, repeater,
  richtext, plus the `in` filter. Confirm in [./fields.md](./fields.md) **first**.
- **Layout & display, tables, actions** — stack/row/flex/grid/section/collapsible/aside,
  display blocks, tabs, action groups; tables with sort/pagination/search/filters/tabs/
  row+bulk actions; the closed effect set. All in [./authoring-pages.md](./authoring-pages.md).
- **Many "missing" Filament features compose from existing primitives** — relation
  managers (multiple tables on a page), read-only detail (display blocks), soft-delete
  (by hand via `->query()`). Check [./recipes.md](./recipes.md) before concluding a feature
  is absent.

## The four documents

Read in this order if you're new; jump straight to one if you know your task.

1. **[authoring-pages.md](./authoring-pages.md)** — the PHP side. The `Page` class, the full
   `S` builder catalog, every builder's API (Form/Table/Column/Action/Tab/Stat/Chart), the
   closed effect set, and the action handler context. **Start here to build a page.**
2. **[fields.md](./fields.md)** — the field inventory as a lookup table: each field's
   factory, its fluent methods, and whether it needs a server endpoint. **Read before
   building any field.**
3. **[wiring.md](./wiring.md)** — how the two sides join: the HTTP endpoints, the
   Inertia-vs-plain-JSON transport rule (the #1 wiring mistake), the contract gate that
   keeps PHP and the client in sync, and the client extension API. **Read when adding a
   field kind, an endpoint, or a custom block.**
4. **[recipes.md](./recipes.md)** — compositions indexed by intent: how to build the thing
   you think is missing out of parts that exist. **Read before concluding a feature needs
   new framework code.**

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

> **A note on `CLAUDE.md`:** the repo's `CLAUDE.md` is the framework-contributor guide and
> is mostly accurate, but it has drifted in two spots these docs correct against source: it
> counts "20 fields" (the real count is 21 + the `in` filter), and it lists the relation
> field as a "plain input" stub (it shipped full async in PR #2). When `CLAUDE.md` and these
> source-verified docs disagree, trust the docs — and fix `CLAUDE.md`.
