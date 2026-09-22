# Wiring: PHP → HTTP → React

> See [./README.md](./README.md) for the overall map. This document owns the HTTP
> endpoint inventory, the transport split, the contract gate, and the client
> extension API.

The DSL emits JSON; the client renders it; these endpoints + this transport rule
+ this contract gate are the seam between the PHP and React worlds.

---

## The transport rule (read this first)

Mixing the two transport modes is **the #1 wiring mistake** — it produces
confusing errors that are hard to trace.

| Category | Examples | Transport | Laravel side | Client side |
|---|---|---|---|---|
| **Persistence** | form submit, page navigation, locale switch | Inertia (`router.post`) | returns redirect + flash; errors land in the native errors bag | `useForm`, `router.post`, `router.get` |
| **Sub-page interactivity** | table refetch, chart data, async-select, relation search, upload, media manager | Plain JSON endpoint | returns `JsonResponse` | `fetch` / `axios`, result handled locally without a page transition |

**Failure symptom when mixed:** using a plain JSON endpoint for a form submit
(or vice versa) causes Inertia's error bag and flash props to be absent,
redirect behavior to break, or a JSON blob to render as a full page — all
without a clear error message pointing at the cause.

---

## Endpoint inventory

All routes are registered under the panel's prefix and name namespace
(`tbtop.{panelId}.*`). Page-scoped routes carry the page's own slug as a
further prefix and as part of the route name (`{slug}.*`).

Route file: `packages/php/routes/admin.php`

### Panel-level routes

| Method | Path pattern | Route name | Controller | Transport | Response shape |
|---|---|---|---|---|---|
| `GET` | `{prefix}/` | *(unnamed)* | closure | 302 redirect | Sends the panel root — the logo link target — to the panel's home page. Default panel only, and only when a page qualifies as home |
| `POST` | `{prefix}/locale` | `tbtop.{panel}.locale` | `LocaleController` | Inertia-compatible redirect | `redirect()->back()` |
| `GET` | `{prefix}/{any}` (fallback) | `tbtop.{panel}.fallback` | `PanelErrorController` | Inertia page `admin/error` (404) | `{status: 404, title, message}` + the shared `tbtop` chrome props |

**Panel 404s.** Two paths lead to the `admin/error` page, both rendered by
`PanelErrorPage` inside the panel chrome: the per-panel `Route::fallback()` above (an
unknown URL under the prefix), and a `NotFoundHttpException`/`ModelNotFoundException`
raised while a panel is bound — e.g. `findOrFail()` inside a page's `view()` — caught by
the renderable that `AdminServiceProvider` registers. JSON clients (`Accept:
application/json`, i.e. the table/select/upload endpoints) and requests outside every
panel keep the app's own 404. The client resolves `admin/error` to the exported
`AdminErrorPage` (see `apps/demo/resources/js/admin.tsx`).

### Media manager routes (prefix: `{prefix}/api/media`, name: `tbtop.{panel}.media.*`)

| Method | Path pattern | Route name | Controller | Transport | Response shape |
|---|---|---|---|---|---|
| `GET` | `/api/media` | `media.index` | `MediaController@index` | JSON | `{data: MediaItem[], folders: MediaFolder[], total, page, perPage}` — query: `perPage` (≤200), `page`, `search`, `folder` (empty = root), `sort`, `dir`. `folders` lists the child folders of the current level, never paginated |
| `POST` | `/api/media/upload` | `media.upload` | `MediaUploadController` | JSON | `MediaItem` (201) |
| `POST` | `/api/media/import-url` | `media.import-url` | `MediaImportController` | JSON | `MediaItem` (201) |
| `GET` | `/api/media/{id}` | `media.show` | `MediaController@show` | JSON | `MediaItem` |
| `GET` | `/api/media/{id}/download` | `media.download` | `MediaDownloadController` | file stream | attachment response for the stored file |
| `PATCH` | `/api/media/{id}` | `media.update` | `MediaController@update` | JSON | `MediaItem` |
| `POST` | `/api/media/{id}/replace` | `media.replace` | `MediaReplaceController` | JSON | `MediaItem` |
| `DELETE` | `/api/media/{id}` | `media.destroy` | `MediaController@destroy` | JSON | `204 No Content` |
| `GET` | `/api/media/folders` | `media.folders.index` | `MediaFolderController@index` | JSON | `FolderItem[]` |
| `POST` | `/api/media/folders` | `media.folders.store` | `MediaFolderController@store` | JSON | `FolderItem` (201) |
| `PATCH` | `/api/media/folders/{id}` | `media.folders.update` | `MediaFolderController@update` | JSON | `FolderItem` |
| `DELETE` | `/api/media/folders/{id}` | `media.folders.destroy` | `MediaFolderController@destroy` | JSON | `204 No Content` or `{message}` (409 if non-empty) |

### Notification routes (prefix: `{prefix}/api/notifications`, name: `tbtop.{panel}.notifications.*`)

Back the header bell (`$s->notifications()`). Every route is scoped to the
authenticated notifiable — a foreign notification id answers 404, never 403.
Polling interval comes from `PanelConfig::notificationsPolling($seconds)`,
defaulting to 30 seconds; pass `null` explicitly to disable polling. The client
still fetches once on mount and each time the bell opens; mark-read/remove/clear
are applied optimistically and never refetch.

| Method | Path pattern | Route name | Controller | Transport | Response shape |
|---|---|---|---|---|---|
| `GET` | `/api/notifications` | `notifications.index` | `NotificationsController@index` | JSON | `{data: NotificationItem[], unreadCount: int}` |
| `POST` | `/api/notifications/{notification}/read` | `notifications.read` | `NotificationsController@markRead` | JSON | `204 No Content` |
| `DELETE` | `/api/notifications/{notification}` | `notifications.destroy` | `NotificationsController@destroy` | JSON | `204 No Content` |
| `DELETE` | `/api/notifications` | `notifications.clear` | `NotificationsController@destroyAll` | JSON | `204 No Content` |

Authoring side is plain Laravel plus a thin builder — see
[api/notifications.md](./api/notifications.md):

```php
Notification::make()->title('Import finished')->success()
    ->actions([NotificationAction::make('View')->url('/admin/imports/12')])
    ->sendToDatabase($user);
```

The payload is stored in the database and rendered page-independently, so a
notification action is a **link only** — it can never carry a server closure.

### Page-scoped routes (registered per-page via the page class's `slug()`)

| Method | Path pattern | Route name | Controller | Transport | Response shape |
|---|---|---|---|---|---|
| `GET` | `{page-path}` | `{slug}` | `PageController@show` | Inertia | Inertia page `admin/page` with props: `{slug, title, layout, structure, data, breadcrumbs?}` |
| `POST` | `{page-path}/forms/{tbtopForm}` | `{slug}.form` | `FormSubmitController` | Inertia | `redirect()->back()` + `Inertia::flash('tbtop.effects', […])` |
| `POST` | `{page-path}/actions/{tbtopAction}` | `{slug}.action` | `ActionController` | JSON | `{effects: Effect[]}` |
| `POST` | `{page-path}/actions/{tbtopAction}/data` | `{slug}.actionData` | `ActionDataController` | JSON | `{data: <query result>}` |
| `GET` | `{page-path}/tables/{tbtopTable}` | `{slug}.table` | `TableController` | JSON | `{data: {data: Row[], total, page, perPage, tabCounts?}}` |
| `GET` | `{page-path}/data/{tbtopData}` | `{slug}.data` | `DataController` | JSON | `{data: <query result>}` |
| `POST` | `{page-path}/select-create/{tbtopField}` | `{slug}.selectCreate` | `SelectCreateController` | JSON | `{value, label}` |
| `POST` | `{page-path}/select-options/{tbtopField}` | `{slug}.selectOptions` | `SelectOptionsController` | JSON | three modes, picked by the body: `{search}` → `{options: [{value, label, display?}]}` · `{value}` → `{option: {value, label}\|null}` · `{values: []}` → `{options: [...]}` (resolve many saved values in one round-trip) |
| `POST` | `{page-path}/tables/{tbtopTable}/filters/{tbtopFilter}/options` | `{slug}.tableFilterOptions` | `TableFilterOptionsController` | JSON | same responder and shape as `selectOptions`, for an async `select()->query()` used as a table filter |
| `POST` | `{page-path}/daterange-ranges/{tbtopField}` | `{slug}.daterangeRanges` | `DaterangeRangesController` | JSON | `{ranges: [{from?, to?}]}` — re-runs `disabledRanges()` with the posted `{deps}` |
| `POST` | `{page-path}/relation-search/{tbtopField}` | `{slug}.relationSearch` | `RelationSearchController` | JSON | search mode: `{options: [{value, label}]}` · resolve mode: `{option: {value, label}\|null}` |
| `POST` | `{page-path}/live-region/{tbtopRegion}` | `{slug}.liveRegion` | `LiveRegionController` | JSON | `{nodes: Node[]}` — re-runs the region's render closure with `{deps}` filtered to its `dependsOn()` list |
| `POST` | `{page-path}/uploads/{tbtopField}` | `{slug}.upload` | `FieldUploadController` | JSON | `{data: {path, url}}` |
| `GET` | `{page-path}/uploads/{tbtopField}/view` | `{slug}.uploadView` | `FieldUploadViewController` | signed URL | streams private file |
| `POST` | `{page-path}/cells/{tbtopTable}/{tbtopColumn}` | `{slug}.cell` | `EditableColumnController` | JSON | `{effects: Effect[]}` |
| `POST` | `{page-path}/tables/{tbtopTable}/reorder` | `{slug}.tableReorder` | `TableReorderController` | JSON | `{effects: Effect[]}` (refreshTable) |

**`RelationSearchController` modes** — distinguished by request body: send
`{search: string}` for a search, or `{value: string}` to resolve a single
known value to its label.

**Modal data query (`actionData`)** — a modal action that calls `->query(fn,
needs)` emits `query: true` + `queryNeeds: [...]` on its modal `spec`. The
client fetches the `.../actions/{name}/data` endpoint on open and feeds the
result to the modal body (a form prefills from it — returned keys must match
field names). `query`/`queryNeeds` are part of the modal branch of
`actionSpec` in the schema. The prebuilt `EditAction` (`Dsl\Actions`) wraps
this whole shape.

**Row reordering** — `TableBuilder::reorderable('sort_order')` emits
`options.reorder: {column}` on the table node and makes that column the default
sort (so a no-sort reload returns the persisted order). The client mounts a
dnd-kit drag context only while reordering is *allowed*: no sort (or sort ==
`{column}:asc`), no active filters/search, and the default tab — otherwise the
handles hide and a disabled-grip hint is shown (Filament behaviour). On drop the
client POSTs `{ids: [...]}`; `TableReorderController` validates every id is
inside the table's query scope (rejects 422 otherwise — the reorder analogue of
the editable-cell scope guard), then writes each id's index to `column` in one
transaction. Hitting a non-reorderable table is a 422.

**Form submit effects** — `FormSubmitController` flashes a `tbtop.effects`
array via `Inertia::flash`. The effect set is closed; see
[./authoring-pages.md](./authoring-pages.md) for the full catalog.

---

## Package configuration

`packages/php/config/tbtop-admin.php` (publish with
`php artisan vendor:publish --tag="tbtop-admin-config"` — **not** `admin:install`,
which publishes only the host wiring files).
It is heavily commented — read it directly for the authoritative detail. What
matters when authoring:

| Key | Why you'd touch it |
|---|---|
| `panels` | The list of `Panel` class-strings. **A panel that isn't here has no routes.** Everything else panel-shaped (prefix, guard, pages, locales, chrome) lives in that class's `configure()`, not in config. |
| `content_locales` / `default_content_locale` | The locales a `translatable()` field stores. Global on purpose — content locales describe the *data*, not a panel, unlike `PanelConfig::locales()`, which is the *UI* language. The default one drives which locale a field's base `rules()` validate. |
| `relation.search_cap` | Row cap for the relation-search endpoint; a field overrides it with `->searchLimit()`. |
| `media.disk` / `accept` / `max_size` | Media-library storage and what may be uploaded. `accept` takes fnmatch patterns; `max_size` is in **kilobytes** (Laravel validation units) — note the `Upload` field's own `maxSize()` is in **bytes**. |
| `media.conversions` / `profiles` | Variants generated per raster image: `profiles` is `name => [maxWidth, maxHeight]` (or a long form with per-profile format/quality). |
| `media.url_import` | Timeout and an `allowed_hosts` allowlist for import-from-URL. Empty means any non-blocked host — the SSRF guard still applies. |

> **SVG is sanitized, not trusted.** Uploads are cleaned server-side by
> `Media\SvgSanitizer` keyed off file content (not the spoofable MIME), and
> `text/html` is refused regardless of `accept`. A custom `Upload::saveUsing()`
> bypasses that path — sanitize yourself if you take it.

### Artisan commands

| Command | What it does |
|---|---|
| `php artisan admin:install` | Publishes three host files — `resources/views/admin.blade.php`, `resources/js/admin.tsx`, `resources/css/admin.css` — and prints the four steps it deliberately does **not** patch (Vite input list, `->rootView('admin')`, Tailwind v4, `npm install`). It does **not** publish the config; that is `vendor:publish --tag="tbtop-admin-config"`. `--force` overwrites existing files. |
| `php artisan vendor:publish --tag="tbtop-admin-config"` | Publishes `config/tbtop-admin.php`. Migrations need no step — the provider declares `runsMigrations()`; publish them with `--tag="tbtop-admin-migrations"` only to customize them first. |
| `php artisan make:tbtop-page {name}` | Scaffolds a `Page` class. `--path=` sets the route URI, `--group=` the nav group, `--no-nav` omits nav registration, `--force` overwrites. The name must be a valid class identifier. Reports which panel discovers the new page, or tells you to register it with `pages()` when none does. |
| `php artisan tbtop:cache-pages` | Atomically rebuilds the discovered page index for all configured panels. Run before `route:cache`; rebuild both after changing discovered pages. |
| `php artisan tbtop:clear-cached-pages` | Removes the discovered page index. Also run `route:clear` to return to uncached routing. |

---

## The contract gate

The PHP DSL, the JSON Schema (`packages/contracts/structure.schema.json`), and
the React zod grammar describe **one** wire vocabulary. They drift silently.

### The drift guard

`packages/contracts/fixtures/kitchen-sink.json` is the shared artifact:

1. The PHP side emits it (serializes `KitchenSinkPage`).
2. `ContractTest.php` validates the emission against the schema.
3. `ContractTest.php` diffs the emission against the committed snapshot.
4. The client renders the snapshot in its own tests.

One file, both sides pinned to it.

### When to run

After **any DSL change** (new block kind, new field kind, any shape change):

```bash
# from packages/php/
vendor/bin/pest --filter Contract
```

If the kitchen-sink output changed intentionally, regenerate the snapshot:

```bash
UPDATE_FIXTURES=1 vendor/bin/pest --filter Contract
```

Then **review the diff** — an unexpected diff means the wire shape broke.

### The parity test

`FieldKindParityTest.php` (`packages/php/tests/FieldKindParityTest.php`)
enforces that `KindClass::make('x')` and `$s->kind('x')` produce identical
serialized output for every built-in kind registered in `S::BUILT_IN_KINDS`.
Add a field kind → register it in both spots or this test fails.

### The rule

> **A new block or field kind → schema update + PHP contract test in the same
> change. Never in separate PRs.** Two separate PRs means two truths (PHP says
> one shape, client expects another) with no gate catching the gap.

### Shared formatting: table cells and display values

`Tbtop\Admin\Http\KindFormat::apply(string $kind, array $meta, mixed $value)` is the
single source of date/datetime/number/money formatting. Both the table column projection
(`ColumnProjection`) and the `displayValue` display block call it, so a value formats
identically whether it lands in a table cell or a detail view.

The **four display-value kinds** (M-96) — `displayValue`, `displayImage`,
`displayRichtext`, `displayKeyValue` — each have an `allOf` if/then branch in
`structure.schema.json` with `additionalProperties: false` on their options. The wire split
mirrors the table:

- `displayValue` with `money`/`date`/`datetime`/`number`: the formatted string is baked into
  `options.value` server-side (no format meta on the wire — it would be dead weight).
- `displayValue` with `badge`/`boolean`/`icon`: emits the raw value plus its
  color/icon meta (`badge`/`boolean`/`iconMap`); the client renders it, reusing the table
  cell helpers (`BadgeCell`/`BooleanIconCell`/`IconMapCell`) via a synthesized column slice.
- `displayRichtext` ships the Lexical `state` map; the client mounts a read-only,
  lazy-loaded `LexicalComposer` (shared `NODES`+`theme` with the editor) to render it.

For the full picture of adding a new field kind to both sides, see
[./fields.md](./fields.md).

### Navigation wire shapes

`tbtop.nav` (`$defs/nav`) and `tbtop.userMenuItems` (`$defs/userMenuItems`) are shared
Inertia props built by `NavBuilder::build($panel)` and `PanelConfig::userMenuItems()`
respectively (`packages/php/src/AdminServiceProvider.php`). Three `$defs` in
`structure.schema.json` cover them:

- **`navItem`** — `{label, href, order, icon?, badge?, badgeColor?, newTab?, children?}`.
  `children` is a self-referencing array of `navItem` — the nesting mechanism for
  `nav()['parent']` (see [./recipes.md](./recipes.md#recipe-9--navigation-configuration)).
- **`navGroup`** — `{key, group, items: navItem[], icon?, collapsible?, collapsed?}`; `nav` is
  `navGroup[]`. `group` is the display label or `null` for the single ungrouped bucket
  (items that declared no group), which the client renders without heading or indent.
- **`userMenuItem`** — `{label, href, icon?, newTab?}`; no `order`/`children` — user-menu
  entries are a flat list, not grouped or nested.

All three are `additionalProperties: false`, same drift-guard discipline as every other
wire shape: `ContractTest.php` asserts a nested-nav tree and a `userMenuItems` payload
against these `$defs` directly (not via the kitchen-sink snapshot, since nav depends on
panel/page wiring the kitchen-sink fixture doesn't exercise).

---

## Client extension points

Use these when you need an app-specific field or block **without editing the
core packages**. The mechanism is the block registry in
`packages/client/src/render/blockRegistry.ts`.

### The three functions

**`registerBlock`** — lowest-level registration. Takes a full descriptor and
stores it in the registry.

```ts
// packages/client/src/render/blockRegistry.ts
function registerBlock<TKind extends string, TOptions>(
  descriptor: BlockDescriptor<TKind, TOptions>,
): BlockDescriptor<TKind, TOptions>
```

Where `BlockDescriptor` is:

```ts
interface BlockDescriptor<TKind extends string = string, TOptions = unknown> {
  kind: TKind;
  behavior: "leaf" | "container" | "field";
  render: ComponentType<RenderProps<TOptions>>;
  defaultOptions?: Partial<TOptions>;
}
```

**`defineBlock`** — thin wrapper over `registerBlock`; takes `kind` and the
descriptor body separately.

```ts
// packages/client/src/render/defineBlock.ts
function defineBlock<TKind extends string, TOptions>(
  kind: TKind,
  descriptor: {
    behavior: "leaf" | "container" | "field";
    render: ComponentType<RenderProps<TOptions>>;
    defaultOptions?: Partial<TOptions>;
  },
): BlockDescriptor<TKind, TOptions>
```

**`defineFieldClient`** — higher-level helper for field kinds. Accepts separate
`form` and `cell` components, and wires the surface-switching logic
automatically.

```ts
// packages/client/src/render/defineFieldClient.tsx
interface FieldClientDescriptor<P = unknown> {
  form: ComponentType<FieldFormProps<P>>;
  cell: ComponentType<FieldCellProps<P>>;
  defaultOptions?: P;
}

function defineFieldClient<T extends string, P>(
  type: T,
  descriptor: FieldClientDescriptor<P>,
): BlockDescriptor<T, P>
```

### Canonical example: rating field in the demo consumer

The demo registers a custom `rating` field on **both** sides. This is the
pattern to follow in a consumer project.

Client (`apps/demo/resources/js/admin.tsx`) — `defineFieldClient` takes a
separate `form` and `cell` component, so you don't branch on `ctx.surface`
yourself:

```tsx
defineFieldClient<"rating", number>("rating", { form: RatingForm, cell: RatingCell });
```

PHP (`apps/demo/app/Admin/Fields/Rating.php`) — a `Field` subclass whose
`kind()` returns the same wire string, with fluent setters for its options:

```php
final class Rating extends Field
{
    protected function kind(): string
    {
        return 'rating';
    }

    public function max(int $max): static
    {
        return $this->set('max', $max);
    }
}
```

Registered in the consumer's service provider
(`apps/demo/app/Providers/AppServiceProvider.php`), which is what makes
`$s->rating('score')` resolve:

```php
S::register('rating', Rating::class);
```

Call `registerBlock` (or `defineBlock` / `defineFieldClient`) **before**
`createInertiaApp` in your admin entry file. The block registry must be
populated before the first render.

### Cross-wire note

Registering only on the client gives you a **client-only** field: the React
side can render the kind, but no PHP builder emits it. That is fine for fields
whose options originate client-side (hardcoded or from a non-DSL source).

To compose the field in the PHP DSL (e.g. `$s->rating('score')`) you need the
PHP half too — a `Field` subclass plus `S::register()`, as shown above. The
demo's `rating` has both, which is why it works end to end.

Two things you do **not** need for a consumer-app field like this:

- **No schema entry.** `packages/contracts/structure.schema.json` takes an open
  kind string; only structurally distinct kinds need a schema branch.
- **No core registry edit.** `S::register()` is the two-phase escape hatch —
  `S::BUILT_IN_KINDS` and `kindMap()` are for kinds shipped *by the package*.
  A consumer field never touches `packages/php/src/Dsl/S.php`.

See [./fields.md](./fields.md) for the full new-field checklist.
