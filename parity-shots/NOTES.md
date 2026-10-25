# PHP vs Node admin: parity screenshots

Captured 2026-10-25 at 1440x900, full page (the `nav-*` shots are viewport only).
File names: `{side}-{screen}-{theme}.png`; the `cms-` prefix marks the CMS.
`tools/shots.mjs` regenerates them (Playwright, cookie `tbtop_theme`).

## Sources

| Shots | Side | Source |
|---|---|---|
| `php-*` | PHP | `apps/demo` at `claude/project-thread-e37hve` (7821b842), `?nav=sidebar` |
| `node-*` | Node | `apps/node-demo` at the same commit, pages from `packages/node/example/posts.ts` |
| `cms-php-*` | PHP | tbtop-cms `main` (f61ecad) workbench |
| `cms-node-*` | Node | tbtop-cms PR #320 head (6a6d572) `packages/node/workbench`, `vite preview` |

The CMS node workbench pins `@tbtop/admin` (node) at `ADMIN_SHA` 89e12fe and
`@tbtop/inertia-admin` 0.7.1 from npm, so it does **not** include the shell fixes from PR #389.

## Part A: demo posts

Host and DSL differences, not package ones:
- The PHP demo ships an emerald/stone theme and its own font in `app.css`; node-demo has no host
  CSS, so its primary is black and its font is the system stack.
- The PHP demo sets `maxContentWidth('7xl')`; node-demo sets nothing, so its content is a narrower centred column.
- The PHP posts page is a bigger DSL: filter tabs, cover/colour/slug/published columns, per-column search,
  row groups, View/Publication/Replicate actions, Quick create, a second users table, a footer, a
  floating style switcher (demo-only). The node example is ID/Title/Status/Views with Edit and Delete.
- PHP forms carry locale tabs (en/uk), richtext, toggle, date, upload, relation and a repeater; the node
  form is Title/Slug/Status/Views. The PHP create button says "Create", the node one says "Save".
- The PHP default nav layout is topbar (`php-posts-index-topbar-*`); the sidebar shots use `?nav=sidebar`.

Shell differences worth a look:
- Header: PHP has a notifications bell; node has none (node-demo configures no notifications).
- Sidebar: node puts "Docs" as an ungrouped item above the groups and shows the group description
  ("Posts and drafts") under the heading. Its only group is not collapsible, so there is no chevron and
  `node-nav-collapsed`/`node-nav-expanded` are identical. In PHP, Content/System collapse and expand.
- Nav badge: PHP shows a count badge (8) on Posts; node shows none (not configured).
- Row actions: node shows an icon on Edit (pencil); PHP Edit has no icon.
- Neither side shows a breadcrumb on the edit or new forms; both show it on the index.

## Part B: CMS

The chrome is identical: brand, sidebar toggle, bell, Inbox, user menu, uppercase collapsible groups
with chevrons, and collapse/expand on all three groups.

| Screen | Differences (node relative to PHP) |
|---|---|
| Header | The external link reads "tbtop demo" (site name) instead of "View site". |
| Nav | Content: no "Media library", an extra "Inbox". Design: "Layout" instead of "Layouts", no "Blocks". Settings: "Site"/"SEO" instead of "Site settings"/"SEO settings"; "Audit log" and "Site health" are missing. |
| Dashboard | Subtitle "Welcome back" instead of "Welcome to TableTop CMS."; 3 stat cards (no Media); "Leads by status" / "Submissions per day" titles; links "All pages"/"Inbox" instead of "Open pages"/"Open submissions"; the System (CPU/memory/disk), Versions and Infrastructure sections are missing. |
| Pages index | "New page" is a body button under the title, not a header action at the right; no page description; tabs Page/Category/Article without counts and no Deleted tab; no table search; a Path column instead of SEO; Type is plain text, not an uppercase muted label; the date is `toLocaleString` ("10/25/2026, 4:01:22 PM") instead of "Oct 25, 2026"; row actions are Edit plus a solid red Delete instead of an open-on-site icon plus Duplicate. |
| Page edit | Same layout: status bar, tabs, Publication/Structure/Ordering/Image cards. Compared like for like with `cms-node-page-edit-about-light.png` (About us, a plain page, next to PHP Landing). Node adds an en/uk locale switcher (the PHP workbench has one locale); the subtitle is the path (`/about-us`) instead of the slug (`landing`); Slug is not marked required (PHP shows `*`); the Image field is an upload dropzone ("Click or drop a file") instead of the media picker ("Choose image"). The missing Slug, Type and Delete in `cms-node-page-edit` are specific to Home: About us has all three. |
| Layout index | A plain stack (heading, "0 block(s)", "Edit header") instead of two cards with descriptions ("No blocks yet", Edit); title "Layout" instead of "Layouts"; no page description. |
| Layout edit | The title is "Edit layout" plus a "Header" heading instead of "Edit Header layout"; the breadcrumb is "Layout > Edit" instead of "Layouts > Edit Header layout"; it shows "No block kinds are registered for this place."; Save is left-aligned with no Cancel, while PHP has a right-aligned Cancel + Save. |
| Site settings | Title "Site" instead of "Site settings"; no description; the media fields are upload dropzones instead of image pickers; Save is left-aligned without Cancel. |
| SEO settings | Captured (`cms-*-seo-settings-light.png`); not reviewed in detail. |

Seed data differs (PHP has 1 page, node has 8), so counts and rows are not comparable.
