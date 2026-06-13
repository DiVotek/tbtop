# Tabletop Admin — Release Roadmap

> Living doc. The entry point for "what ships when and why." Detail backlog lives in
> `docs/backlog.md`; this file is the index + ordering + value rationale.
> Stack: Laravel package (`tbtop/admin`) + React client (`@tbtop/inertia-admin`).
> Last revised: 2026-06-13 (panels/layout/chrome wave merged — PR #1, `bfad033`).

## The product in one line

PHP-DSL admin pages (Filament-shaped, no Livewire) serialized to JSON and rendered by a
ported React interpreter. Laravel owns the backend (auth, queues, validation, migrations,
notifications); the DSL owns page composition; the client owns rendering.

## Release shape — two phases

| Phase | Audience | Done when |
|---|---|---|
| **1 — Internal** | Team's own projects, EasyCar first | EasyCar runs in production on the published `composer` + `npm` packages |
| **2 — External** | Open-source public | A stranger can install, follow a quickstart, and stand up an admin |

Phase 1 proves the packages on a real, paying project before exposing them. Phase 2 is
docs + site + changelog + public roadmap on top of a validated core.

---

## Current state — ground truth (read before planning)

Surveyed from source on 2026-06-13, after the panels wave merged (PR #1, `bfad033`).

### Solid — ships as-is

- **DSL authoring** (`S` builder): 20 field types, layout (stack/row/grid/section/tabs/collapsible/aside), display blocks, `Page` base class with `path/view/can/nav/breadcrumbs/layout`.
- **Multi-panel** (PR #1): `Panel` class + `PanelConfig`, per-panel prefix/guard/middleware/pages/locales, `tbtop.{panel}.{slug}` route names, request-scoped `CurrentPanel`. Design in `packages/php/adr/panels.md`.
- **Page layouts** (PR #1): `Page::layout()` → `'admin'` (sidebar shell) | `'center'` (chrome-less, centered). Client dispatches `AdminLayout` vs `CenterLayout`.
- **Chrome-as-DSL** (PR #1): per-panel `Chrome` class with `header/sidebar/footer(S): Node`; predefined block kinds `navMenu/userMenu/logo/localeSwitcher/spacer`; React `slots` as escape hatch.
- **Tables**: columns with kinds (text/date/money/badge/boolean/icon), sort, pagination, global search, per-field filters (modal/inline), filter tabs (URL-state, opt-in counts — PR #1), generic `in` (multi-value `WHERE IN`) filter (PR #2), row actions, bulk actions, row-click, column visibility, URL-state persistence.
- **Forms**: async record load, validation (PHP rules → wire constraints → zod-on-blur), unsaved guard, scroll-to-error, nested repeaters, translatable fields with per-locale tabs, `helperText`/`tooltip` (PR #1), server-driven async relation field (search endpoint + `labelKey`/`query` — PR #2).
- **Charts + stats**: line/bar/area/pie/donut with runtime params; stat cards with delta/sparkline/icon.
- **Display**: static blocks + `S::markdown()` (server-side commonmark → `displayHtml`, PR #1); flex options on `row`/`stack` (`justify/align/gap/wrap`, PR #1).
- **Actions/effects**: closed effect set (`notify/redirect/refreshTable/resetForm/closeModal`), confirm dialogs, modal actions (`->size()` sm/md/lg/full — PR #1), custom client-handler escape hatch.
- **Auth** (server-side, demo via Breeze controllers): login, register, password reset, email verification, **2FA** (enroll/challenge/disable/recovery), password confirmation, **passkeys** (management + bypass-2FA). *Backend lives in the demo, not the package — no package-side auth backend or example login/register Page classes yet (see 1.1).*
- **Media manager**: library, folders, upload with image variants (GD), picker field, SSRF guard, replace-keeping-id.
- **i18n**: translation hook, locale switching, layered messages, content-translatable fields; per-panel UI locales (PR #1).
- **DX**: `make:tbtop-page` scaffold command, `PostFactory` + bulk seeder (PR #1).
- **Contract pipeline**: zod grammar → JSON Schema → PHP contract tests + shared kitchen-sink fixture (drift guard).
- **Quality gates**: Pest (PHP, ~389) + bun test (client, ~664) with deep coverage, phpstan/larastan L5, Pint, oxlint+Biome — all blocking in CI except the client `Test` step (network-leak, below).

### Real gaps (narrow, known)

| Gap | Severity | Note |
|---|---|---|
| **Example auth pages** | 🟡 | Layout primitive is done (`center`); only `LoginPreviewPage` demo stub exists. Needs a backend-story design session (demo uses Breeze, no Fortify / no package-side auth backend): pages + thin controllers in package vs pages-only vs adopt `laravel/fortify`. |
| **Extraction** | 🟡 partially done | Own repo extracted 2026-06-11. Remaining: lockstep composer+npm release packaging (1.3). |
| **Soft-delete macro** | 🟡 | Trashed filter + restore/force actions. Expressible by hand via `->query()` today. |
| **Infolist / read-only detail view** | 🟡 | Record display without a form. |
| **CSV export / import** | 🟡 | Export actions (Filament does via queues). |
| **Global search** | 🟡 | Needs layout-slot design session. |
| **Stat/metric polish, sticky table header, filter chips, saved filters, per-column search** | 🟢 | Detail in `backlog.md`. |
| **Mobile sidebar (drawer)** | 🟢 | End-of-polish. |
| **Dark-mode completeness** (recharts + Lexical toolbar not theme-token-bound) | 🟢 | |
| **Client test network leak** | 🟡 | 4 tests (`visitTemplate`, one `ActionGroup`) pass locally but time out on CI with `ECONNREFUSED` — Inertia `<Link>` prefetch escapes the fixture's fetch stub. The client `Test` CI step is non-blocking until the harness blocks network (NOT a blunt global stub). Repro: clean sandbox, no localhost route. |

---

## Phase 1 — Internal release

Goal: **EasyCar in production on the packages.** Everything here is gated on "does EasyCar
need it to ship?" — not on backlog completeness.

### 1.0 — Decisions to lock first (next)

- **EasyCar re-map onto the Laravel stack.** The existing EasyCar docs target the dead
  Node/Hono server (pipeline steps, `ctx.acc`, bundles, M-65/M-56 seams). On this stack the
  backend *is* Laravel: queues, notifications, money casts, validation, policies, jobs are
  native. Produce a fresh doc mapping each entity/feature to: admin-DSL page · plain Laravel
  (model/migration/policy/job) · genuine `@tbtop/admin` gap. **This is the alignment step —
  still open.**
- **Extraction timing.** ~~In-place vs extract-first.~~ **Resolved 2026-06-11: extracted**
  to its own repo. Lockstep release packaging remains in 1.3.

### 1.1 — Pre-EasyCar primitives

**Landed in PR #1 (panels wave, 2026-06-13):** ✅ panel core (multi-admin) ·
✅ page layouts (`admin`/`center`) · ✅ chrome-as-DSL · plus the small wave (modal fixes,
`S::markdown`, flex options, `helperText`/`tooltip`, `make:tbtop-page`, filter tabs).

**Landed in PR #2 (this branch, 2026-06-13):** ✅ relation field — real async (server
search endpoint mirroring `select-create`; client wires the existing async single-select) ·
✅ generic `in` filter kind (`whereIn`, fixed-options multi-select).

**Still open — blocks the CRM:**

| # | Item | Value | Effort |
|---|---|---|---|
| 1 | **Example auth pages** | Opt-in login/register Page classes (`center` layout), overridable by extending. **Needs a design session first:** the demo uses Breeze controllers living in `apps/demo` — there is NO Fortify and NO package-side auth backend to reuse. Open choice: pages + thin controllers in package (self-contained) vs pages-only (dev wires backend) vs adopt `laravel/fortify`. Deferred out of the relation/`in`-filter wave. | M |

### 1.2 — EasyCar build (the validation driver)

Build the CRM. Each place the admin can't express something becomes a prioritized backlog
item — driven by the real project. Stage 1 entity model is already mapped (re-map updates it
for Laravel). Likely surfaces:

- Soft-delete macro (fleet/customers/bookings) → promote from backlog if EasyCar needs it.
- Infolist / read-only detail (customer profile, booking summary) → promote if needed.
- XOR-FK / status-engine guards → plain Laravel model hooks (project code, not framework).

### 1.3 — First release

- ~~Extract `inertia/` → own repo~~ done 2026-06-11.
- Lockstep composer + npm versioning (`tbtop/admin` + `@tbtop/inertia-admin`).
- Re-enable changesets — internal release **is** the first real consumer (CLAUDE.md
  currently says skip "until real consumers"; this flips it on).
- `TbtopAdmin::panel()` provider (packaging phase — backlog item).

**Phase 1 exit gate:** EasyCar serves production traffic on the published packages.

---

## Phase 2 — External release

Goal: **a stranger can install and succeed.** Built on a core EasyCar already validated.

### 2.1 — Docs

- Quickstart (install → first page → first table → auth) — the make-or-break artifact.
- DSL reference (every `S` builder + field + their methods — the inventory exists, needs prose).
- Concepts: page model, action/effects protocol, contract pipeline, validation flow.
- **Filament migration guide** (see below — the highest-leverage adoption doc).
- Per-repo `CLAUDE.md` for contributors (separate from user docs — see this session).

### 2.2 — Site + release infra

- Landing site (positioning vs Filament/Nova/Backpack).
- Changelog (changesets → CHANGELOG generation).
- Public roadmap (this doc, trimmed for outsiders).
- Versioning/SemVer policy, contribution guide, issue templates.

### 2.3 — Feature parity gaps that gate adoption

Promote from backlog when they block real external use (most are 🟡 above): CSV
export/import, soft-delete macro, infolist, global search, saved filters.

---

## Filament migrants — what they'll expect (forward-looking)

Filament is the gravity well. People arriving from it carry muscle memory; the closer the
mental model, the lower the switching cost. High-value because the DSL is already
Filament-shaped (Resources/Pages/forms/tables/actions).

**Already aligned (lead with these):**

- Resource/Page + form/table builders, fluent column kinds, row/bulk actions, action confirm
  + modal — the core gesture maps almost 1:1.
- Server-authored, no client logic — same "PHP is the source of truth" promise, **without
  Livewire** (the stated reason for the pivot — Livewire prod fragility). This is the
  *positioning wedge*: "Filament's authoring model, page-granular Inertia transport, no
  Livewire."

**Expected but missing — rank by adoption pain:**

| Filament feature | Status | Priority for migrants |
|---|---|---|
| Soft-delete table support (trashed filter, restore) | backlog 🟡 | High — extremely common |
| Infolist (read-only detail) | backlog 🟡 | High — half of Filament screens |
| Relation managers (edit related rows inline on a record) | not built | High — signature Filament feature |
| Global search | backlog 🟡 | Medium |
| Notifications/database notifications center | backlog (toasts only) | Medium |
| Widgets/stats overview on dashboard | **done** (stat + chart) | — |
| Multi-tenancy | backlog (out of prototype scope) | Medium — Filament markets it hard |
| Saved filters / filter presets | backlog 🟡 | Low–Medium |
| CSV export (queued) | backlog 🟡 | Medium |
| Custom fields/columns via registry | **done** (`register`/`defineFieldClient`/`defineBlock`) | — (document it) |

**Net:** the riskiest migrant gaps are **relation managers** and **soft-delete + infolist**.
None are architecturally hard on this stack (all compose from existing primitives), but they
define whether a Filament user feels at home. Sequence them right after EasyCar validates the
core — EasyCar will independently demand soft-delete + infolist + relations, so the internal
driver and the external adoption need point the same way.

---

## Sequencing summary

```
DONE ─► Panel core + layouts + chrome-as-DSL + small wave      (1.1 core, PR #1)
DONE ─► Relation field (async) + generic `in` filter          (1.1, PR #2)
NOW ──► EasyCar re-map doc                                     (1.0)
     ──► Example auth pages (after a backend-story design)     (1.1 remainder)
     ──► Build EasyCar; promote backlog items it demands       (1.2)
     ──► Lockstep release + changesets on                      (1.3)   ◄── Phase 1 gate
     ──► Quickstart + DSL reference + Filament migration guide  (2.1)
     ──► Site + changelog + public roadmap                      (2.2)
     ──► Adoption-gap features (soft-delete, infolist, relation managers) (2.3)
```

The through-line: **EasyCar and Filament-migrant needs converge** on the same short list
(relations, soft-delete, infolist). Build for EasyCar, get adoption-readiness for free.
