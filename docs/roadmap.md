# Tabletop Admin — Release Roadmap

> Living doc. The entry point for "what ships when and why." Detail backlog lives in
> `docs/backlog.md`; this file is the index + ordering + value rationale.
> Stack: Laravel package (`tbtop/admin`) + React client (`@tbtop/inertia-admin`).
> Last revised: 2026-06-11.

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

Surveyed from source on 2026-06-11, not from the (stale, Node-era) PRDs.

### Solid — ships as-is

- **DSL authoring** (`S` builder): 20 field types, layout (stack/row/grid/section/tabs/collapsible/aside), display blocks, `Page` base class with `path/view/can/nav/breadcrumbs`.
- **Tables**: columns with kinds (text/date/money/badge/boolean/icon), sort, pagination, global search, per-field filters (modal/inline), row actions, bulk actions, row-click, column visibility, URL-state persistence.
- **Forms**: async record load, validation (PHP rules → wire constraints → zod-on-blur), unsaved guard, scroll-to-error, nested repeaters, translatable fields with per-locale tabs.
- **Charts + stats**: line/bar/area/pie/donut with runtime params; stat cards with delta/sparkline/icon.
- **Actions/effects**: closed effect set (`notify/redirect/refreshTable/resetForm/closeModal`), confirm dialogs, modal actions, custom client-handler escape hatch.
- **Auth** (Fortify-based, server-side): login, register, password reset, email verification, **2FA** (enroll/challenge/disable/recovery), password confirmation, **passkeys** (management + bypass-2FA). All test-covered.
- **Media manager**: library, folders, upload with image variants (GD), picker field, SSRF guard, replace-keeping-id.
- **i18n**: translation hook, locale switching, layered messages, content-translatable fields.
- **Contract pipeline**: zod grammar → JSON Schema → PHP contract tests + shared kitchen-sink fixture (drift guard).
- **Quality gates**: Pest (PHP) + bun test (client) with deep coverage (~80 PHP tests, ~80 client tests), phpstan/larastan, Pint, oxlint+Biome.

### Real gaps (narrow, known)

| Gap | Severity | Note |
|---|---|---|
| **Auth-page layout** | 🔴 blocks EasyCar | Auth *backend* exists; there's no centered/chrome-less layout to render login/register pages. Only `AdminLayout` (sidebar shell) exists. |
| **Relation field is a stub** | 🔴 blocks EasyCar | `RelationForm` is a plain `<Input>` writing raw IDs. Async machinery exists (`useAsyncSearch`, async select works) — fix is wiring, not new infra. |
| **Extraction** | 🔴 blocks Phase 1 | Code lives in `inertia/` on a branch. No "package to consume" until extracted + lockstep-released, OR consumed in-place. |
| **Soft-delete macro** | 🟡 | Trashed filter + restore/force actions. Expressible by hand via `->query()` today. |
| **Infolist / read-only detail view** | 🟡 | Record display without a form. |
| **CSV export / import** | 🟡 | Export actions (Filament does via queues). |
| **Global search** | 🟡 | Needs layout-slot design session. |
| **Stat/metric polish, sticky table header, filter chips, saved filters, per-column search** | 🟢 | Detail in `backlog.md`. |
| **Mobile sidebar (drawer)** | 🟢 | End-of-polish. |
| **Dark-mode completeness** (recharts + Lexical toolbar not theme-token-bound) | 🟢 | |
| **Lint/format debt** | 🟢 | `inertia/` never ran oxlint/biome/pint — extraction first pointed them at the code. ~20 oxlint findings (client/demo) + Pint format misses (`S.php`, `StatDslTest.php`). CI `lint` job is non-blocking until a dedicated pass clears it. |
| **Client test network leak** | 🟡 | 4 tests (`visitTemplate`, one `ActionGroup`) pass locally but time out on CI with `ECONNREFUSED` — Inertia `<Link>` prefetch escapes the fixture's fetch stub. Pre-existing (inertia/ had no CI); the client `Test` CI step is red until the harness blocks network. Repro: clean sandbox, no localhost route. |

---

## Phase 1 — Internal release

Goal: **EasyCar in production on the packages.** Everything here is gated on "does EasyCar
need it to ship?" — not on backlog completeness.

### 1.0 — Decisions to lock first (this session / next)

- **EasyCar re-map onto the Laravel stack.** The existing EasyCar docs target the dead
  Node/Hono server (pipeline steps, `ctx.acc`, bundles, M-65/M-56 seams). On this stack the
  backend *is* Laravel: queues, notifications, money casts, validation, policies, jobs are
  native. Produce a fresh doc mapping each entity/feature to: admin-DSL page · plain Laravel
  (model/migration/policy/job) · genuine `@tbtop/admin` gap. **This is the alignment step.**
- **Extraction timing.** In-place (build EasyCar against `inertia/` dir, extract after it
  proves out) vs extract-first (own repo + lockstep release, then consume). Recommendation:
  **in-place first** — validate on a real project before paying extraction cost. Matches the
  logic that kept `inertia/` a subdir rather than a new repo.

### 1.1 — Pre-EasyCar primitives (must land before the CRM)

Ordered by EasyCar dependency.

| # | Item | Value | Effort |
|---|---|---|---|
| 1 | **Layout primitive + auth-page layout** | Every consumer needs login/register pages. `Page` gains a `layout()` hint (`admin`/`auth`/`blank`); client gets an `AuthLayout` (centered, no nav). Auth backend already done — this renders it. Developer owns the auth *method*; pages are composed from existing fields + a `submit` to their controller. Passkeys = action calling the existing WebAuthn endpoint. | S (1–2 d) |
| 2 | **Relation field — real async** | CRM is relation-dense (every booking → customer/car/location). Wire `RelationForm` to the existing async-select infra + `labelKey`/`query`. Stub → working is small. | S |
| 3 | **`in` filter kind** (verify) | Permission-matrix list scoping (`allowedLocations`, `allowedCategories`) needs `WHERE col IN (...)`. Confirm the filter API covers it; if not, add. | XS–S |

### 1.2 — EasyCar build (the validation driver)

Build the CRM. Each place the admin can't express something becomes a prioritized backlog
item — driven by the real project. Stage 1 entity model is already mapped (re-map updates it
for Laravel). Likely surfaces:

- Soft-delete macro (fleet/customers/bookings) → promote from backlog if EasyCar needs it.
- Infolist / read-only detail (customer profile, booking summary) → promote if needed.
- XOR-FK / status-engine guards → plain Laravel model hooks (project code, not framework).

### 1.3 — Extraction + first release

- Extract `inertia/` → own repo (or finalize in-place packaging).
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
NOW ──► EasyCar re-map doc + extraction-timing decision        (1.0)
     ──► Layout/auth-page primitive  +  relation field  +  `in` filter   (1.1)
     ──► Build EasyCar; promote backlog items it demands       (1.2)
     ──► Extract + lockstep release + changesets on            (1.3)   ◄── Phase 1 gate
     ──► Quickstart + DSL reference + Filament migration guide  (2.1)
     ──► Site + changelog + public roadmap                      (2.2)
     ──► Adoption-gap features (soft-delete, infolist, relation managers) (2.3)
```

The through-line: **EasyCar and Filament-migrant needs converge** on the same short list
(relations, soft-delete, infolist). Build for EasyCar, get adoption-readiness for free.
