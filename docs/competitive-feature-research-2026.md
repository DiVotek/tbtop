# Competitive Feature Research — Admin Panels & Builders (2026)

> Research doc, not a living index. Snapshots the competitive landscape as of **2026-06-13**,
> rates the features users most want, maps each against Tabletop's current state
> (see `docs/roadmap.md` for ground truth), and proposes an ordered, hour-estimated backlog.
> Ordering rule for the proposal: **higher impact first, lower complexity as the tie-breaker.**

## TL;DR

The admin-panel market in 2025–2026 split into two camps, and both are converging on the
same short list of expected features:

- **Code-first PHP/Laravel tools** (Filament, Nova, Backpack) — our direct competitive set.
  Filament is the gravity well; its v4 (stable Aug 2025) and v5 (Jan 2026) raised the
  baseline with **nested resources / relation managers**, **unified schemas** (forms,
  infolists and tables share one builder), **non-Eloquent table data**, a TipTap rich-text
  editor, hard-marketed **multi-tenancy**, and an **AI scaffolding tool (Blueprint)**.
  Backpack v7 shipped **Data Components** (tables/forms/grids anywhere), **Skins** (brand
  theming), **Chips**, **lifecycle hooks** and **reusable filters**. Nova 5 is incremental
  (UI components, performance).
- **Low-code / headless builders** (Retool, Appsmith, Budibase, Refine, react-admin) — not
  our buyer, but they set end-user expectations. The 2025–2026 theme there is **AI-assisted
  building** (Budibase AI bindings + CRON generator, Retool AI agents, Refine's
  Inferencer/AI), **Git + environments**, **RBAC**, **audit-log providers**, and a polished
  table (TanStack, server-side everything).

For Tabletop the takeaway is sharp: our authoring model already matches Filament 1:1 on the
core gesture (Resource/Page + form/table builders, row/bulk actions, modal+confirm) **without
Livewire** — that's the positioning wedge. The gaps that decide whether a Filament migrant
feels at home are a *narrow, known* set: **relation managers, soft-delete, infolist, global
search, CSV export**. None are architecturally hard on this stack — they compose from
existing primitives — and crucially, the EasyCar internal driver demands the same short list.
Build for EasyCar, get adoption-readiness for free.

Three *forward-looking* differentiators surfaced that are worth a deliberate bet rather than
catch-up: a **Cmd+K command palette** (now table stakes in modern builders, cheap for us), a
built-in **audit/activity log** (every governance-minded buyer asks for it), and an **MCP
server / AI surface** over the page registry (Filament's Blueprint is build-time codegen; an
*MCP-over-the-live-admin* read/write surface would be a genuine wedge, and the backlog already
floats it).

## Method & sources

Surveyed the latest public releases and "what users want" round-ups (June 2026). The
competitor set was chosen to bracket both camps. Primary signal: official release notes and
feature-analysis write-ups for Filament v4/v5, Backpack v7, Nova 5, and the low-code builders;
secondary signal: 2026 "best admin panel builder" round-ups for end-user expectation trends.
Tabletop's current state is taken from `docs/roadmap.md` (surveyed from source) and
`docs/backlog.md`, not re-derived.

Selected sources are listed at the bottom.

### Competitor release snapshot

| Product | Latest | Headline features that move the baseline |
|---|---|---|
| **Filament** (Laravel, Livewire) | v4 stable (Aug 2025), v5 (Jan 2026) | Nested resources / relation managers, unified Schemas (form+infolist+table), non-Eloquent/static table data, TipTap rich text, partial render perf, multi-tenancy, **Blueprint** AI scaffolding (v5), Livewire 4 |
| **Backpack** (Laravel) | v7 (2025) | Data Components (use tables/forms/grids anywhere), Skins (brand theming), Chips, lifecycle hooks, SaveAction classes, reusable Filters |
| **Laravel Nova** | v5 (2025) | Incremental: new UI components, performance, resource-management polish |
| **Retool** | rolling | AI agents + AI-powered workflows, native mobile, Git source control + staging/prod environments |
| **Appsmith** | rolling | AI JS generation, native Git (PR review, CI/CD), env branches |
| **Budibase** | rolling | AI bindings helper (auto-JS), AI CRON generator, self-host economics |
| **Refine** (headless React) | v5 | Inferencer (AI/auto codegen from API shape), Audit-Log provider, Access-Control provider (RBAC), Devtools, multi data-provider |
| **react-admin** | rolling | UI-kit-agnostic, many data providers (Directus/Supabase/Strapi), saved queries |

## Feature analysis

**Demand** = how strongly the market asks for it / how hard competitors market it (1–5, 5 = highest).
**Complexity** = build cost on *this* stack given existing primitives (1–5, 5 = hardest).
**Tabletop status** from `roadmap.md`/`backlog.md`.

| # | Feature | Demand | Complexity | Tabletop status |
|---|---|---|---|---|
| F1 | **Relation managers** — edit related rows inline on a record (Filament signature) | 5 | 5 | ❌ Not built (relation *field* is async-wired; managing related *rows* is the gap) |
| F2 | **Soft-delete macro** — trashed filter + restore/force, per table | 5 | 2 | 🟡 Expressible by hand via `->query()`; no macro |
| F3 | **Infolist / read-only detail view** — record display without a form | 5 | 3 | 🟡 Backlog; half of Filament screens are this |
| F4 | **Global search** — cross-resource Cmd-driven search in chrome | 4 | 3 | 🟡 Backlog; needs layout-slot design |
| F5 | **CSV export (queued)** + import | 4 | 3 | 🟡 Backlog; Filament does export via queues |
| F6 | **Command palette (Cmd+K)** — fuzzy nav + action launcher | 4 | 2 | ❌ Not built; now table-stakes in modern builders |
| F7 | **Audit / activity log** — who changed what, timeline on a record | 4 | 3 | ❌ Not built (not even in backlog); every governance buyer asks |
| F8 | **Multi-tenancy** — tenant-scoped data + tenant switcher | 4 | 5 | 🟡 Backlog, out of prototype scope (panels ≠ tenancy) |
| F9 | **RBAC roles/permissions UI** — manage roles, policy-driven field/action gating | 4 | 4 | 🟡 Partial: Laravel policies + page `can()`; no roles UI/field-level gating |
| F10 | **AI scaffolding / MCP surface** — generate pages or expose the registry to agents | 4 | 5 | 🟡 MCP server floated in backlog; no AI codegen |
| F11 | **Database notifications center** — header bell, unread, mark-read | 3 | 3 | 🟡 Backlog (toasts only today) |
| F12 | **Saved filters / presets** — name and recall filter combos | 3 | 3 | 🟡 Backlog |
| F13 | **Non-Eloquent / external table data** — render API/array rows | 3 | 3 | 🟡 Tables assume a query builder; arbitrary sources unsupported |
| F14 | **Reorderable rows (drag-and-drop)** — `->reorderable('sort_order')` | 3 | 3 | 🟡 Backlog (deferred; dnd-kit dep) |
| F15 | **Table polish bundle** — sticky header, filter chips, per-column search, column reorder | 3 | 2 | 🟢 Backlog |
| F16 | **Theming / brand skins + dark-mode completeness** — token-bound recharts/Lexical | 3 | 2 | 🟢 Chrome-as-DSL exists; dark-mode + skins incomplete |
| F17 | **Mobile sidebar (drawer)** — responsive chrome | 3 | 2 | 🟢 Backlog (end-of-polish) |
| F18 | **Example auth pages** — opt-in login/register Page classes (`center` layout) | 3 | 3 | 🟡 Layout primitive done; needs backend-story design |

Already at parity (lead with these, don't rebuild): server-authored pages, fluent
form/table/column builders, row/bulk/modal/confirm actions, **20 field types incl. real
Lexical rich text**, charts + stat widgets (dashboard widgets = **done**), multi-panel,
chrome-as-DSL, media manager, full i18n, server-side auth incl. **2FA + passkeys**, and a
**custom field/column registry** (`register`/`defineFieldClient`/`defineBlock`).

## Proposed roadmap — ordered by impact, then complexity

Ordering = highest impact first; within a tier, lowest complexity first. Hours are rough
build estimates for *this* codebase (primitives exist), inclusive of contract test + schema +
both-sides wiring where a feature crosses the wire. They are engineering estimates, not
commitments.

### Tier A — quick wins (high value, low cost) — do first

| Order | Feature | Impact | Complexity | Est. hours |
|---|---|---|---|---|
| 1 | **F2 Soft-delete macro** — trashed filter + restore/force actions; pure DSL macro over existing filter+action primitives | High | Low | **12–16** |
| 2 | **F6 Command palette (Cmd+K)** — client overlay over the page registry + server actions; high perceived polish, no schema change | High | Low | **16–20** |
| 3 | **F15 Table polish bundle** — sticky header, filter chips, per-column search, column reorder; all client-side over existing table state | Med | Low | **16–20** |
| 4 | **F16 Theming/skins + dark-mode completeness** — bind recharts + Lexical toolbar to theme tokens; expose brand-color skin | Med | Low | **14–18** |
| 5 | **F17 Mobile drawer sidebar** — responsive chrome; client-only | Med | Low | **8–12** |

### Tier B — core parity (high value, medium cost) — the Filament-migrant + EasyCar set

| Order | Feature | Impact | Complexity | Est. hours |
|---|---|---|---|---|
| 6 | **F3 Infolist / read-only detail view** — new display composition; reuses display blocks + record load | High | Med | **24–32** |
| 7 | **F5 CSV export (queued)** — export action via Laravel queue + download; import is a separate, larger follow-up | High | Med | **16–20** (export) / **+24–30** (import) |
| 8 | **F4 Global search** — chrome slot + per-resource search registry + JSON endpoint | High | Med | **20–28** |
| 9 | **F7 Audit / activity log** — Laravel model events → `activity_log`, timeline block on a record | High | Med | **20–28** |
| 10 | **F18 Example auth pages** — opt-in login/register Page classes; gated on a backend-story design session | Med | Med | **16–24** (after design) |
| 11 | **F12 Saved filters / presets** — name + recall filter combos in URL/user state | Med | Med | **14–18** |
| 12 | **F11 Database notifications center** — header bell, unread count, mark-read; polling first | Med | Med | **20–28** |
| 13 | **F14 Reorderable rows** — `->reorderable()`, dnd-kit, reorder endpoint | Med | Med | **14–18** |
| 14 | **F13 Non-Eloquent table data** — let `->query()` accept array/paginator/API source | Med | Med | **18–24** |

### Tier C — strategic bets (high value, high cost) — sequence deliberately

| Order | Feature | Impact | Complexity | Est. hours |
|---|---|---|---|---|
| 15 | **F1 Relation managers** — inline related-row tables/forms on a record; the riskiest migrant gap | High | High | **40–60** |
| 16 | **F9 RBAC roles/permissions UI** — roles management + policy-driven field/action gating | High | High | **30–40** |
| 17 | **F10 AI / MCP surface** — `laravel/mcp` over the page registry (read-only phase 1, gated); potential wedge vs Filament's build-time Blueprint | High | High | **40–60** |
| 18 | **F8 Multi-tenancy** — tenant scoping + switcher; Filament markets it hard, but out of current prototype scope | Med-High | High | **50–70** |

### Why this order

- **EasyCar and Filament migrants converge** on the same Tier-A/B short list (soft-delete,
  infolist, relations, export). Tier A items are nearly free and visibly raise polish, so they
  de-risk demos before the internal release; Tier B is the parity core the CRM will demand
  anyway.
- **Command palette and audit log are cheap, market-expected, and not yet on the roadmap** —
  promoting them is the highest leverage net-new recommendation from this research.
- **Relation managers are #1 by demand but #15 by order** on purpose: highest complexity, and
  EasyCar will surface its exact shape, so building it speculatively risks the wrong
  abstraction. Sequence it right after EasyCar validates the record/relation model.
- **MCP/AI surface** is the one place to consider *leading* rather than following: Filament's
  AI is build-time scaffolding; an MCP read/write surface over the live, gate-respecting admin
  is differentiated and aligns with where the low-code camp is heading. Worth a dedicated
  design session (already flagged in `backlog.md`).

## Recommendation

Adopt Tier A immediately (≈ 66–86h total) as a pre-internal-release polish wave — it closes
the most visible "modern admin" gaps for the least cost and improves every demo. Fold Tier B
into the EasyCar build (`roadmap.md` §1.2) so the internal driver pays for parity. Hold Tier C
for explicit design sessions, with **relation managers** sequenced first (EasyCar-driven) and
**MCP/AI** treated as a strategic wedge rather than catch-up.

Net new to the roadmap from this research: **command palette (F6)** and **audit log (F7)** —
recommend adding both to `backlog.md` under Tables/Platform.

---

## Sources

- [Filament v4 Beta — new features (Laravel Daily)](https://laraveldaily.com/post/filament-v4-beta-new-features)
- [Filament v4 Beta comprehensive analysis (Antonio Cortes)](https://antoniocortes.com/en/2025/06/30/filament-v4-beta-comprehensive-analysis-of-the-revolutionary-features-that-will-transform-laravel-application-development/)
- [Filament v4 & v5 overview (Sadique Ali, Medium)](https://sadiqueali.medium.com/filament-v4-v5-build-laravel-admin-panels-faster-than-ever-7b64f4961438)
- [Backpack v7 is launched — what's new (Laravel News)](https://laravel-news.com/backpack-v7-is-launched-see-whats-new)
- [Filament vs Nova vs Backpack in 2025 (Filament HUB)](https://filament-hub.com/blog/filament-vs-nova-vs-backpack-in-2025-which-admin-stack-actually-doesnt-suck)
- [Laravel Nova 5.0 — what's new (Eminent Coders)](https://eminentcoders.com/laravel-nova-5-0-whats-new/)
- [Appsmith vs Budibase vs ToolJet (ToolJet blog)](https://blog.tooljet.com/appsmith-vs-budibase-vs-tooljet/)
- [Budibase vs Retool vs Superblocks 2026 (Superblocks)](https://www.superblocks.com/blog/budibase-vs-retool)
- [Refine — enterprise internal tools / Inferencer & providers](https://refine.dev/)
- [React Admin dashboard frameworks 2026 (Refine blog)](https://refine.dev/blog/react-admin-dashboard/)
- [Top admin panel builder tools 2026 (WeWeb)](https://www.weweb.io/blog/best-admin-panel-builder-tools)
- [10 essential features every admin panel needs (DronaHQ)](https://www.dronahq.com/admin-panel-features/)
