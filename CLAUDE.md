# Tabletop Admin

PHP-DSL admin pages, rendered by a React client over Inertia. **No Livewire.**
See `docs/roadmap.md` for release plan, `PROJECT.md` for vision (note: vision was written
for the Node stack — philosophy holds, the runtime is now Laravel; re-read with that lens).

> **Public docs are English-only.** This repo is going open-source. README, docs,
> code comments, commit messages, and any consumer-facing text are written in
> English. Non-Latin strings in tests/seeders/locale files are deliberate i18n
> fixtures (e.g. `uk` translatable data) — leave them; they prove the feature.

## What this is

A consumer writes admin pages in a **PHP DSL** (`S` builder, Filament-shaped). Pages
serialize to **StructureNode JSON** and ship as Inertia props. A **React client**
(`@tbtop/inertia-admin`) interprets the JSON and renders. Laravel owns everything backend:
auth (Fortify), validation, queues, migrations, notifications, money casts. The DSL owns
page composition. The client owns rendering. **These three boundaries are the architecture.**

## Workspace layout

Monorepo. Two published packages + a demo app.

- `packages/php/` → `tbtop/admin` (composer) — the DSL, HTTP controllers, auth, media. **Laravel package.**
- `packages/client/` → `@tbtop/inertia-admin` (npm) — React interpreter: render registry, ~20 field components, layout shell, data clients.
- `packages/contracts/` → generated `structure.schema.json` + `fixtures/kitchen-sink.json` — the wire-grammar contract shared by both sides.
- `apps/demo/` → Laravel app wiring both packages end-to-end. **The reference consumer — read its `app/Admin/Pages/` to see real DSL usage.**

## The one rule that matters most: where does code go?

A two-language stack means the #1 mistake is putting logic on the wrong side. Before writing
code, place it:

| You're adding… | It goes in… | Because… |
|---|---|---|
| A new page, table, form, action | `apps/demo/app/Admin/Pages/` (demo) or the consumer app | Pages are authored in PHP, per-request |
| A new field **type** | **both** `packages/php/src/Dsl/Fields/` AND `packages/client/src/fields/` + schema | A field is a PHP builder + a React component + a grammar entry. All three or it's broken. |
| Validation logic | PHP (Laravel rules) — **always** | PHP is the security boundary. The client zod is UX-only (on-blur), never trusted. |
| Backend behavior (queue, job, notification, auth method, DB) | Plain Laravel in the consumer app | Laravel owns the backend. Don't reinvent it in the DSL. |
| Rendering / interactivity | `packages/client/src/` | The client owns the screen |
| A new effect | **Don't, by default.** The set is closed (`notify/redirect/refreshTable/resetForm/closeModal`). "I need a new effect" usually means a `custom` client handler or a server redirect. |

If you can't place it from this table, **ask** — don't guess. A misplaced responsibility is
the most expensive mistake on this stack.

## The contract is a hard gate

The PHP DSL, the JSON Schema, and the React grammar describe **one** wire vocabulary. They
drift silently unless disciplined:

- **New block or field kind → schema + a PHP contract test in the SAME change.** Never
  separate PRs. The risk is "two truths" (PHP says one shape, client expects another).
- The drift guard is `packages/contracts/fixtures/kitchen-sink.json`: PHP emits it, validates
  it against the schema, and the client renders it. One artifact, both sides.
- After any DSL change run the PHP contract tests (`vendor/bin/pest --filter Contract` in
  `packages/php/`). If the kitchen-sink snapshot changed intentionally, regenerate with
  `UPDATE_FIXTURES=1 vendor/bin/pest --filter Contract` and **review the diff** — an
  unexpected diff means you broke the wire shape.
- `FieldKindParityTest` enforces `KindClass::make('x')` ≡ `$s->kind('x')`. Add a field kind →
  register it in both spots or this fails.

## Check before you build

Weak agents reinvent what exists. Before adding anything, confirm it's not already there:

- **Fields (21 + the `in` filter):** text, textarea, password, number, date, datetime,
  daterange, boolean, checkbox, radio, select (static + async + creatable), tags, colorpicker,
  keyvalue, slug, upload, media, relation, repeater, richtext (real Lexical); plus `inFilter`
  (wire kind `in`, filter bars only). Grep `packages/client/src/fields/` and
  `packages/php/src/Dsl/Fields/` first. Full lookup in `docs/ai/fields.md`.
- **Layout/display:** stack, row, flex, grid, section, collapsible, aside, tabs,
  displayText/Html/Alert/Divider (headings are `displayText()->variant('heading')` — there is
  no bare `heading`/`divider` method), markdown, actionGroup. In `S.php`.
- **Table features:** sort, pagination, global search, per-field filters (modal/inline), row
  actions, bulk actions, row-click, column visibility, URL-state. In `TableBuilder.php`.
- **Auth:** login, register, password reset, email verification, 2FA, passkeys, password
  confirmation — implemented in the **demo via Laravel Breeze controllers** (test-covered),
  **not** in the package. There is NO Fortify and no package-side auth backend. Don't rebuild
  the flows to learn them; the open gap is auth-page *layout* + a package-side backend story
  (see roadmap §1.1).
- **Custom field without touching core:** `registerBlock` / `defineFieldClient` (client) — see
  `apps/demo/resources/js/admin.tsx` for the rating-field example. Use this for app-specific
  fields instead of editing the packages.

Known stubs/gaps (don't assume these work): no auth-page layout, no package-side auth
backend, no soft-delete macro, no infolist. (The relation field shipped full async in PR #2 —
no longer a stub.) Full list in `docs/roadmap.md` and `docs/backlog.md`.

## Commands

PHP package (`cd packages/php`):
- `vendor/bin/pest` — tests · `vendor/bin/pest --filter <name>` — one test
- `vendor/bin/phpstan analyse` — static analysis (larastan; keep level passing)
- `vendor/bin/pint` — format

Client package (`cd packages/client`):
- `bun test` — tests · `bun test <path>` — one file
- `tsc --noEmit` — typecheck

Demo (`cd apps/demo`): standard Laravel — `php artisan serve`, `npm run dev` (Vite for the
admin entry). Browser e2e for walking-skeleton flows lives here.

**Run only tests for what you changed.** CI runs the full suite.

## Stack

- **PHP 8.4+**, Laravel 11/12/13, Inertia v3, Pest 4, larastan, Pint.
- **React 19**, Inertia React adapter, Lexical (richtext), Radix (a11y primitives), recharts,
  Tailwind, zod (client grammar mirror), bun test + Testing Library.
- Transport rule: **persistence → Inertia** (`router.post`, native errors bag + flash);
  **sub-page interactivity → plain JSON endpoints** (table refetch, charts, async-select,
  upload). Mixing them produces confusing errors — check this in review.

## Code style

`~/.claude/skills/code-style` + `~/.claude/skills/typescript-style` auto-load for TS work.
PHP follows Pint + the same size/bucket/naming principles. Key carry-overs:

- File ≤200 lines, function ≤50, guard clauses up top, ≤2 nesting levels.
- One worker job per function (validate / transform / query / mutate).
- No `any` in TS (`unknown`); no null sentinels (union or throw).
- **DSL builders are exempt from line counts** for their fluent method lists — but their
  *logic* (serialization, rule collection) follows every rule.

## Tests

- Colocated: `name.test.tsx` next to source (client), `tests/*Test.php` (PHP, Pest).
- Boundary-level, behavior-not-shape (testing skill). For the DSL: assert the **serialized
  node shape** a consumer relies on, not internal builder state.
- Bug → failing regression test first (the `debugging` skill governs this).
- `ArchTest.php` bans `dd`/`dump`/`ray` — never commit them.

## ADRs

Per-package `packages/<pkg>/adr/<domain>.md`, one file per domain. Frontmatter + `## Decisions`
bullets (append as they land) + short `## Why`. ~100 lines target, 200 cap. Edit superseded
decisions in place with `> Replaces previous decision (see git history)`.

## Releasing

Both packages ship **lockstep** from one tag — `@tbtop/inertia-admin` (npm) and `tbtop/admin`
(Packagist) always carry the same version. The single source of truth is the `version` field in
`packages/client/package.json`; the git tag is derived from it (PHP has no version field — its
version *is* the tag).

Process (manual button, one run does both):
1. Bump `version` in `packages/client/package.json` in a PR; merge to `main`.
2. GitHub → Actions → **Release** → Run (from `main`). The `release.yml` workflow reads the
   version, refuses if that tag exists, pushes `vX.Y.Z`, then:
   - **npm** publishes inside the workflow via **Trusted Publishing (OIDC)** — no token. The
     workflow filename `release.yml` is registered as the trusted publisher on npmjs.com;
     renaming it breaks publishing.
   - **Packagist** publishes itself from the pushed tag via its GitHub webhook (no step needed).
   - A GitHub Release is created with generated notes.

The build runs on **bun** (`prepublishOnly` → tsup), but `npm publish` needs **Node ≥ 22 /
npm ≥ 11.5.1** for OIDC — the release job sets up both. The published npm package ships `dist`
(see `tsup.config.ts`); the demo aliases the package to `src` in its Vite config for HMR.

## Changesets

One per PR, only when public API changes (anything reachable from a package's `exports` /
composer autoload). Skip for internal refactors, tests, docs. **Currently off** until first real
consumer (EasyCar) — flips on at the internal release (see roadmap §1.3).
