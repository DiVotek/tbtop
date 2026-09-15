# Host page discovery research

Status: proposal for discussion, not an accepted API or implementation.

## Current Tabletop behavior

- `PanelConfig::pages()` replaces its explicit class list. `PanelRegistry` builds panel configurations once per container lifetime. Discovery must preserve existing setter semantics. Sources: [PanelConfig](../packages/php/src/Panels/PanelConfig.php), [PanelRegistry](../packages/php/src/Panels/PanelRegistry.php).
- Pages supply both screen routes and their endpoint clusters. Middleware overrides apply to the whole cluster. The first page with a static path determines the panel-root redirect unless a page owns the root. Registration order therefore affects behavior. Source: [routes](../packages/php/routes/admin.php).
- Navigation consumes the same registry but filters out pages with route parameters or no `nav()`, then applies gates. Discovery must not equate registration with navigation visibility. Source: [NavBuilder](../packages/php/src/Navigation/NavBuilder.php).
- Default slugs use only the class basename, so pages in different namespaces can collide. Sources: [Page](../packages/php/src/Pages/Page.php), [routes](../packages/php/routes/admin.php).
- The demo includes host pages and the package-owned `MediaLibraryPage`. Explicit registration remains necessary. The generator currently creates pages under the application namespace's `Admin\\Pages` and asks for manual registration. Sources: [AdminPanel](../apps/demo/app/Admin/AdminPanel.php), [MakePageCommand](../packages/php/src/Commands/MakePageCommand.php).

## Filament reference

Reviewed the upstream 5.x branch; links are branch references, not immutable snapshots.

- `discoverPages(in:, for:)` accepts an explicit directory and namespace, recursively derives class names from paths, checks autoloadability and non-abstract page inheritance, and honors `isDiscovered()`. Explicit `pages()` is additive and bypasses the discovery opt-out. `getPages()` deduplicates. Source: [HasComponents](https://github.com/filamentphp/filament/blob/5.x/packages/panels/src/Panel/Concerns/HasComponents.php).
- Standalone pages default to discoverable; resource pages disable discovery through inheritance rather than directory exclusions. Sources: [Page](https://github.com/filamentphp/filament/blob/5.x/packages/panels/src/Pages/Page.php), [resource Page](https://github.com/filamentphp/filament/blob/5.x/packages/panels/src/Resources/Pages/Page.php).
- Component caching persists a per-panel registration index, not rendered pages or authorization decisions. New components require rebuilding or clearing it. Sources: [deployment docs](https://filamentphp.com/docs/5.x/deployment), [HasComponents](https://github.com/filamentphp/filament/blob/5.x/packages/panels/src/Panel/Concerns/HasComponents.php).

## Options

1. Explicit per-panel directory and namespace discovery, alongside manual pages. Recommended: bounded scanning, works with multiple panels and modular host applications.
2. Convention-only discovery under `app/Admin/Pages`. Less configuration, but ambiguous ownership with multiple panels and custom layouts. Could later be an explicit shorthand, not a global default.
3. Composer-wide discovery with attributes or a registration manifest. Supports distributed modules but introduces broader scanning or a build lifecycle and new ownership metadata. Not justified by the current requirement.

## Proposed contract and open decisions

- Keep separate manual pages and discovery roots. Repeated `pages()` replaces only manual registrations; repeated `discoverPages()` adds roots. Merge manual pages first, followed by deterministically sorted discovered classes, deduplicated by class. Keep a dashboard explicit to preserve the root redirect.
- Discover concrete `Page` subclasses without instantiating them. A static `isDiscovered(): bool` opt-out affects discovery only. Unlike Filament resource pages, Tabletop edit/detail pages are ordinary pages and must remain eligible; auth pages are also ordinary host pages with middleware overrides.
- Reject duplicate slugs and identical normalized paths within a panel with diagnostics naming both classes. Parameterized route overlap is a separate routing concern; exact duplicate checks do not solve it.
- Prefer an error for an explicitly configured missing directory over silently disabling pages. Decide this before implementation because first-install behavior differs from Filament.
- Keep discovery and its resolved list in PHP. React, the DSL wire schema, navigation authorization, and middleware semantics need no changes.
- A process-local resolved list avoids repeated scans within one container lifetime, not across PHP-FPM requests. Laravel route caching alone does not remove scans needed to build navigation through `PanelRegistry`. Decide whether a persistent page index belongs in the first release after assessing deployment needs; do not claim route caching substitutes for it.
- Implementation verification should cover recursive discovery, exclusions, manual/discovered duplicates, setter/call-order behavior, panel isolation, collisions, root redirect, middleware overrides, and route-cache compatibility. Updating the public API requires regenerating its API reference.
