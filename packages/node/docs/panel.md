# The panel

Everything here is a `createAdmin` option, mirroring PHP's `PanelConfig`.

## Navigation

A page shows up in the sidebar through `nav`:

```ts
nav: { label: "Posts", group: "Content", section: "Blog", parent: "posts", icon: "file-text", order: 1, badge: "3" }
```

`parent` is another page's path and nests the item under it. Pages that fail
`authorize` are left out; a child of a hidden parent moves up a level.

The bare prefix (`/admin`) opens a page whose `path` is `""`; without one it
redirects to the first sidebar page the user may open (external links are skipped),
or a guest to `loginPath`.

- `navigationGroups: [{ key, label, icon, description, collapsible, collapsed, sections }]`: group meta and order; `sections` maps a key to its heading.
- `navigationItems: [{ label, url, icon, newTab }]`: extra links (external ones too).
- `userMenuItems`: links in the profile menu.
- `breadcrumbs: false` turns crumbs off; a page can set its own `breadcrumbs`.

## Shell and look

- `navigation`: `sidebar` (default), `topbar`, `topbar-sidebar`, `rail-sidebar`.
- `chrome: { header, sidebar, footer, headerItems, sidebarItems }`: the shell as DSL nodes, like PHP's chrome. Server actions are not allowed there.
- `appearance: { darkMode, defaultThemeMode, maxContentWidth, density, stylePreset }`.
  `stylePreset` is a shadcn style (`vega` default, `nova`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`).
- `rootView()` renders the document like PHP's `admin.blade.php` stub: `<html lang>` from the UI
  locale, the `style-preset-<name>` class, and the stored theme applied before paint.
- `commandPalette: false | { hotkey, commands: [{ label, url, icon, keywords }] }`.
- `brand`, `unsavedGuard` (default true).
- `environmentIndicator`: a header badge naming the environment, like PHP's
  `->environmentIndicator()`. There is no `APP_ENV` on Workers, so pass the name
  as `environment` (`environment: env.APP_ENV`); without it `createAdmin()` throws.
  `true` shows the built-in label and color for anything but `production`; a map
  overrides per environment (`{ production: "danger", local: { label: "Dev" }, qa: false }`);
  a function `(request) => ({ label, color }) | null` decides per request.

## Locales

- `locales: ["en", "uk"]`, `locale`: UI languages, switched per session.
- `userLocale: (user) => locale | null` and `onLocaleChange: (user, locale) => void`: keep the
  pick per user (a profile column). The saved locale is read before the session's; the hook
  runs after a valid switch from the user menu. PHP's admin keeps the session only.
- `messages: { uk: { "action.save": "..." } }`: host strings over the bundled ones.
- `validationMessages`: per-locale rule templates.
- `contentLocales`, `defaultContentLocale`: translatable fields.

## Several panels

```ts
import { createPanels } from "@tbtop/admin";
const panels = createPanels([admin, partner]); // ids and prefixes must be unique
Bun.serve({ fetch: async (r) => (await panels.handle(r)) ?? new Response(null, { status: 404 }) });
```

The longest matching prefix answers.

## Errors

Throw `new HttpError(404, "Post not found.")` in `view`: the panel renders its
error page inside the shell. A 404 under the prefix does the same, and a page
whose `authorize` refuses renders it with 403; JSON clients get `null` from
`handle` for a 404 so the host answers.
