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
| `POST` | `{prefix}/locale` | `tbtop.{panel}.locale` | `LocaleController` | Inertia-compatible redirect | `redirect()->back()` |

### Media manager routes (prefix: `{prefix}/api/media`, name: `tbtop.{panel}.media.*`)

| Method | Path pattern | Route name | Controller | Transport | Response shape |
|---|---|---|---|---|---|
| `GET` | `/api/media` | `media.index` | `MediaController@index` | JSON | `{data: MediaItem[], total, page, perPage}` |
| `POST` | `/api/media/upload` | `media.upload` | `MediaUploadController` | JSON | `MediaItem` (201) |
| `POST` | `/api/media/import-url` | `media.import-url` | `MediaImportController` | JSON | `MediaItem` (201) |
| `GET` | `/api/media/{id}` | `media.show` | `MediaController@show` | JSON | `MediaItem` |
| `PATCH` | `/api/media/{id}` | `media.update` | `MediaController@update` | JSON | `MediaItem` |
| `POST` | `/api/media/{id}/replace` | `media.replace` | `MediaReplaceController` | JSON | `MediaItem` |
| `DELETE` | `/api/media/{id}` | `media.destroy` | `MediaController@destroy` | JSON | `204 No Content` |
| `GET` | `/api/media/folders` | `media.folders.index` | `MediaFolderController@index` | JSON | `FolderItem[]` |
| `POST` | `/api/media/folders` | `media.folders.store` | `MediaFolderController@store` | JSON | `FolderItem` (201) |
| `PATCH` | `/api/media/folders/{id}` | `media.folders.update` | `MediaFolderController@update` | JSON | `FolderItem` |
| `DELETE` | `/api/media/folders/{id}` | `media.folders.destroy` | `MediaFolderController@destroy` | JSON | `204 No Content` or `{message}` (409 if non-empty) |

### Page-scoped routes (registered per-page via the page class's `slug()`)

| Method | Path pattern | Route name | Controller | Transport | Response shape |
|---|---|---|---|---|---|
| `GET` | `{page-path}` | `{slug}` | `PageController@show` | Inertia | Inertia page `admin/page` with props: `{slug, title, layout, structure, data, breadcrumbs?}` |
| `POST` | `{page-path}/forms/{tbtopForm}` | `{slug}.form` | `FormSubmitController` | Inertia | `redirect()->back()` + `Inertia::flash('tbtop.effects', […])` |
| `POST` | `{page-path}/actions/{tbtopAction}` | `{slug}.action` | `ActionController` | JSON | `{effects: Effect[]}` |
| `POST` | `{page-path}/actions/{tbtopAction}/data` | `{slug}.actionData` | `ActionDataController` | JSON | `{data: <query result>}` |
| `GET` | `{page-path}/tables/{tbtopTable}` | `{slug}.table` | `TableController` | JSON | `{data: {rows, pagination, …, tabCounts?}}` |
| `GET` | `{page-path}/data/{tbtopData}` | `{slug}.data` | `DataController` | JSON | `{data: <query result>}` |
| `POST` | `{page-path}/select-create/{tbtopField}` | `{slug}.selectCreate` | `SelectCreateController` | JSON | `{value, label}` |
| `POST` | `{page-path}/relation-search/{tbtopField}` | `{slug}.relationSearch` | `RelationSearchController` | JSON | search mode: `{options: [{value, label}]}` · resolve mode: `{option: {value, label}\|null}` |
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
respectively (`packages/php/src/AdminServiceProvider.php:52-53`). Three `$defs` in
`structure.schema.json` cover them:

- **`navItem`** — `{label, href, order, icon?, badge?, badgeColor?, newTab?, children?}`.
  `children` is a self-referencing array of `navItem` — the nesting mechanism for
  `nav()['parent']` (see [./recipes.md](./recipes.md#recipe-9--navigation-configuration)).
- **`navGroup`** — `{group, items: navItem[], icon?, collapsible?, collapsed?}`; `nav` is
  `navGroup[]`.
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

The demo (`apps/demo/resources/js/admin.tsx`) registers a custom `rating`
field using `registerBlock` directly. This is the pattern to follow in a
consumer project:

```tsx
registerBlock<"rating", { max?: number; min?: number; step?: number }>({
  kind: "rating",
  behavior: "field",
  render: function RatingRender({ options, ctx }) {
    const max = options.max ?? 5;
    if (ctx.surface === "cell") {
      const val = ctx.binding?.value as number | null;
      return <span>{val ?? "–"}</span>;
    }
    return (
      <Input
        type="number"
        min={options.min ?? 1}
        max={max}
        step={options.step ?? 1}
        defaultValue={(ctx.binding?.value as number | undefined) ?? ""}
        onChange={(e) => ctx.binding?.onChange(Number(e.target.value))}
      />
    );
  },
});
```

Call `registerBlock` (or `defineBlock` / `defineFieldClient`) **before**
`createInertiaApp` in your admin entry file. The block registry must be
populated before the first render.

### Cross-wire note

A field registered this way is **client-only** — the kind string is not in the
schema and the PHP side has no builder for it. That is fine for fields whose
options originate client-side (hardcoded or from a non-DSL source). If the
field must be composed in the PHP DSL (e.g. `$s->rating('score')`) and
transmitted over the wire, it also needs:

1. A PHP field class in `packages/php/src/Dsl/Fields/` (or the consumer app).
2. A schema entry in `packages/contracts/structure.schema.json`.
3. The contract gate to be run and the kitchen-sink snapshot updated.

See [./fields.md](./fields.md) for the full new-field checklist.
