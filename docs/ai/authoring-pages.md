# Authoring Admin Pages

> Part of the AI authoring guide. Start at [./README.md](./README.md).

This reference covers the PHP-DSL side of building admin pages: the `Page` base class,
the `S` builder catalog, every builder's public API, the closed effect set, and the
action handler context. Field details live in [./fields.md](./fields.md). HTTP transport,
the contract pipeline, and endpoint wiring live in [./wiring.md](./wiring.md). Composed
patterns (relation managers, soft-delete) live in [./recipes.md](./recipes.md).

---

## Where does code go — decision tree for agents

This is a **two-language stack**: PHP authors the page, React renders it, Laravel runs the
backend. The single most expensive mistake is putting logic on the wrong side. Place every
line **before** you write it, against these three zones:

| Zone | Owns | You touch it for |
|---|---|---|
| **PHP DSL** (`Admin/Pages/`) | Page *composition* — which fields, tables, actions, layout | A new page, form, table, action, filter, column |
| **React client** (`packages/client/src/`) | *Rendering & interactivity* — how the JSON draws on screen | A new field *kind*'s component, a custom block renderer |
| **Plain Laravel** (the consumer app) | The *backend* — security, persistence, jobs, auth, DB | Validation, queues, notifications, migrations, money casts, auth methods |

Walk the tree top-down; stop at the first match:

1. **Is it a DB write, a job, a notification, an auth method?** → Plain Laravel. Never the
   client. PHP is the security boundary. (Validation *rules* are declared on DSL fields via
   `->rules()` / the fluent helpers and serialized server-side; the *enforcement* is Laravel —
   the client mirror is on-blur UX only, never trusted.)
2. **Is it a brand-new *field type* (a kind the inventory doesn't list)?** → All three at
   once: a PHP builder + a React component + a schema entry, same change. Two of three is a
   broken wire. See [./fields.md](./fields.md) and [./wiring.md](./wiring.md).
3. **Is it how something *looks or behaves* on screen** (a new renderer, a `custom` action
   handler)? → The React client (or `->custom()` on an action for app-specific JS).
4. **Otherwise — a page, form, table, action built from existing parts?** → PHP DSL. This is
   the common case; the demo's `Admin/Pages/` is your corpus.

If the table can't place it, **ask** — a misplaced responsibility is the costliest error on
this stack.

### Worked mis-placements (do NOT do these)

**Mis-placement 1 — validation in client zod.** *"I'll enforce `max:200` on the title in
the React component's zod schema."* **Wrong.** The client zod is **on-blur UX only and never
trusted** — a request can skip the client entirely. Validation is *always* a Laravel rule on
the PHP field: `$s->text('title')->required()->rules('max:200')`
(`Concerns/PostFormFields.php:22`). The zod mirror is generated *from* the PHP rules, not the
other way around.

**Mis-placement 2 — inventing a new effect to navigate.** *"I need the form to redirect
after save, so I'll add a `goTo` effect to `Effects`."* **Wrong.** The effect set is
**closed** (`notify/redirect/refreshTable/resetForm/closeModal`). Redirect already exists —
return `Effects::make()->redirect($url)`, or return a string from `onSubmit`. Adding an
effect kind edits the package for something the contract already covers.

**Mis-placement 3 — a soft-delete macro hand-rolled in the DSL.** *"I'll write the trashed
filter, restore action, and scoping inline on every index page."* **Wrong by default.** The
backend behavior (the `SoftDeletes` trait, the scoping) is plain Laravel on the *model*; the
table affordance is a one-call macro: `->softDeletes($s, Post::class)`
(`SoftDeletesDemoPage.php:55`). Re-deriving it per page is reinventing what the framework
ships.

This decision tree expands the placement table in the repo's `CLAUDE.md`; when in doubt,
that table is the contributor-facing source.

---

## The Page class

Every admin page extends `Tbtop\Admin\Pages\Page`. Two methods are abstract; the rest
are overridable hooks with sensible defaults.

| Method | Signature | Must override? | Meaning |
|---|---|---|---|
| `path()` | `static path(): string` | Yes | Laravel route URI relative to the admin prefix, e.g. `'posts/{post}/edit'` |
| `view()` | `view(S $s): Node` | Yes | Returns the root `Node` tree the client renders |
| `slug()` | `static slug(): string` | No | Stable identifier used in action/form endpoint URLs. Defaults to kebab-cased class basename |
| `title()` | `title(): string` | No | Page heading. Defaults to headline-cased class basename |
| `nav()` | `static nav(): ?array` | No | Nav placement: `['group' => '...', 'label' => '...', 'order' => 0]`, or `null` to hide from nav |
| `can()` | `static can(): ?string` | No | Gate ability name required to view this page. `null` = no gate (any authenticated user) |
| `breadcrumbs()` | `breadcrumbs(): array\|\Closure\|null` | No | Override breadcrumbs. Return `[['label' => '...', 'url' => '...']]`, a closure receiving the page instance, or `null` to auto-build from the nav tree |
| `layout()` | `layout(): string` | No | Shell layout: `'admin'` (sidebar + header, the default) or `'center'` (chrome-less, content centered) |

Example nav registration (from `apps/demo/app/Admin/Pages/PostsIndexPage.php`):

```php
public static function nav(): ?array
{
    return ['group' => 'Content', 'label' => 'Posts', 'order' => 1];
}
```

Gate guard (from `apps/demo/app/Admin/Pages/DashboardPage.php`):

```php
public static function can(): ?string
{
    return 'view-dashboard';
}
```

---

## The `S` builder catalog

The `S` instance is injected into every `view(S $s)` call. It is also the field factory —
but field details are in [./fields.md](./fields.md); only the factory names are listed here.

### Layout blocks

Each layout block accepts children and optional option arrays, and returns a `Node`.

| Method | Signature | Purpose |
|---|---|---|
| `stack` | `stack(array $children, array $opts = []): Node` | Vertical stack of children |
| `row` | `row(array $children, array $opts = []): Node` | Horizontal row of children |
| `flex` | `flex(array $children, string $direction = 'row', ?string $justify = null, ?string $align = null, ?int $gap = null, bool $wrap = false): Node` | Flex container with explicit direction (`'row'`\|`'col'`), justify, align, gap, wrap |
| `grid` | `grid(array $opts, array $children): Node` | Grid layout; `$opts` carries `'cols'` and other CSS-grid options |
| `section` | `section(array $opts, array $children): Node` | Titled card section; `$opts` carries `'title'` |
| `collapsible` | `collapsible(array $opts, array $children): Node` | Section with a chevron toggle; `$opts` must include `'label'`; `'collapsed'` defaults to `false` |
| `aside` | `aside(array $children): Node` | Right-column sticky panel on wide screens |

### Display blocks

| Method | Signature | Purpose |
|---|---|---|
| `displayText` | `displayText(string $content): TextBlock` | Static text; call `->variant('heading'\|'subheading'\|'body'\|'muted')` on the result |
| `displayHtml` | `displayHtml(string $rawHtml): HtmlBlock` | Raw HTML passthrough |
| `markdown` | `markdown(string $content): MarkdownBlock` | Converts markdown server-side; call `->allowHtml()` only for trusted content |
| `displayDivider` | `displayDivider(): Node` | Horizontal rule |
| `displayAlert` | `displayAlert(string $message): AlertBlock` | Alert box; chain `->title(string)` and `->color(Color\|string)` on the result |
| `displayValue` | `displayValue(mixed $value): DisplayValueBlock` | Read-only single value; chain a kind-sugar (`->badge`/`->boolean`/`->icon`/`->money`/`->date`/`->datetime`/`->number`), mirroring table `Column` |
| `displayImage` | `displayImage(string $src): DisplayImageBlock` | Full-size image (`->alt()`/`->caption()`) or a file-download link (`->asLink()`); author passes the URL |
| `displayRichtext` | `displayRichtext(array $state): DisplayRichtextBlock` | Read-only render of a stored Lexical `SerializedEditorState` map |
| `displayKeyValue` | `displayKeyValue(array $map): DisplayKeyValueBlock` | `<dl>` map render of key/value pairs |
| `tabs` | `tabs(array $tabs, array $opts = []): Node` | Tab container; each tab is `['label' => '...', 'body' => ...]` |
| `actionGroup` | `actionGroup(string $label, array $actions, ?string $as = null): Node` | Button group or dropdown; `$as` is `'buttons'`\|`'dropdown'` (default `'buttons'`) |

> **The display-value family is the read-only detail story** (the old "infolist" gap).
> The author holds the record and passes each value to a block directly — there is no
> field-binding layer. `RecordDetailPage` in the demo is the worked example.
> `displayValue` shares its date/datetime/number/money formatting with the table column
> projection via `Tbtop\Admin\Http\KindFormat`: those four bake the formatted string into
> `options.value` server-side; `badge`/`boolean`/`icon` emit the raw value + their
> color/icon meta and the client renders them (the same split the table uses).

### Chrome blocks

These are used in shell/layout trees, not normally in page views. They read their data
from shared Inertia props.

| Method | Purpose |
|---|---|
| `navMenu()` | Sidebar navigation groups |
| `userMenu()` | Profile dropdown (identity, theme, locale, logout) |
| `logo()` | Panel brand text |
| `localeSwitcher()` | UI-locale switcher; hidden when the panel has one locale |
| `spacer()` | Flex spacer pushing siblings to the far edge |

### Data builders

| Method | Signature | Purpose |
|---|---|---|
| `form` | `form(string $name, array $children): FormBuilder` | Creates and registers a form; returns a `FormBuilder` |
| `table` | `table(string $name): TableBuilder` | Creates and registers a table; returns a `TableBuilder` |
| `action` | `action(string $name): ActionBuilder` | Creates and registers an action; returns an `ActionBuilder` |
| `stat` | `stat(string $label): Stat` | Creates a KPI stat card |
| `chart` | `chart(string $name, string $type, array $opts = []): ChartBuilder` | Creates and registers a chart |
| `actionsRow` | `actionsRow(array $actions): Node` | Wraps a list of `ActionBuilder` instances in a `row` node |

### Field factories

`S` exposes every built-in field as a magic method: `text`, `textarea`, `password`,
`number`, `date`, `datetime`, `daterange`, `boolean`, `checkbox`, `radio`, `select`,
`tags`, `colorpicker`, `keyvalue`, `slug`, `upload`, `media`, `relation`, `repeater`,
`richtext`. Each takes a field name as its first argument. Also available:
`inFilter(string $name): InFilter` — a multi-value IN filter for table filter bars.

Full field API is in [./fields.md](./fields.md).

Custom field kinds can be registered with `S::register(string $kind, string $fieldClass)`.

---

## Builders in depth

### FormBuilder

Returned by `$s->form(string $name, array $children)`.

| Method | Signature | Purpose |
|---|---|---|
| `record` | `record(array $record): self` | Pre-fills the form with initial data (lands in page props) |
| `onSubmit` | `onSubmit(Closure $handler): self` | Handler called on form submit; receives `ActionCtx`, returns `Effects` |
| `guardUnsaved` | `guardUnsaved(bool $enabled): self` | Per-form override of the unsaved-changes navigation guard (panel default applies when not called) |

The `onSubmit` handler follows the same signature as action handlers — see **Action handler context** below.

```php
// from apps/demo/app/Admin/Pages/SettingsPage.php
$s->form('settings', [
    $s->section(['title' => 'Site'], [
        $s->text('site_name')->label('Site name')->required()->rules('max:200'),
    ]),
    $s->actionsRow([
        $s->action('save')->label('Save')->color('primary')
            ->keybinding('mod+s')->submit(),
    ]),
])
    ->record($settings->toArray())
    ->onSubmit(function (ActionCtx $ctx): Effects {
        Setting::firstOrCreate([])->update($ctx->form);

        return Effects::make()->notify('Saved');
    })
```

### TableBuilder

Returned by `$s->table(string $name)`.

| Method | Signature | Purpose |
|---|---|---|
| `columns` | `columns(array $columns): self` | Column descriptors: `Column` instances, raw arrays, or shorthand `['name' => 'Label']` |
| `query` | `query(Closure $query): self` | Server-side Eloquent query closure |
| `searchable` | `searchable(array $fields): self` | Table-level list of globally-searchable field names |
| `filters` | `filters(array $fields): self` | Filter fields (same `Field` instances as forms); defaults `filtersIn` to `'modal'` |
| `filtersIn` | `filtersIn(string $mode): self` | `'modal'` (filter icon opens a drawer) or `'inline'` (filters always visible) |
| `deferFilters` | `deferFilters(bool $value = true): self` | Require an explicit Apply action before filter changes narrow the query |
| `filtersFormColumns` | `filtersFormColumns(int $columns): self` | Grid columns for the filters form layout |
| `filtersFormWidth` | `filtersFormWidth(string $width): self` | Modal width when `filtersIn('modal')`: `'sm'`\|`'md'`\|`'lg'`\|`'full'` |
| `tabs` | `tabs(array $tabs): self` | Predefined query-scope tabs; first tab is the default |
| `defaultSort` | `defaultSort(string $field, string $dir = 'asc'): self` | Default sort column and direction |
| `groups` | `groups(string $column): self` | Partition contiguous rows sharing `$column`'s value under group headers (see below) |
| `paginate` | `paginate(int $perPage = 25, array $options = [10, 25, 50, 100]): self` | Pagination config |
| `rowActions` | `rowActions(array $actions): self` | Per-row action buttons; `ActionBuilder` instances |
| `rowClick` | `rowClick(string $actionName): self` | Name of a row action to trigger when the row is clicked |
| `bulkActions` | `bulkActions(array $actions): self` | Checkbox bulk-select actions; `ActionBuilder` instances |
| `softDeletes` | `softDeletes(S $s, string $model, array $options = []): self` | Soft-delete convenience layer (see below) |

#### `groups()` — row grouping

`->groups(string $column)` partitions contiguous rows sharing `$column`'s value under a
group header row. It requires `->defaultSort($column, ...)` to already be set (throws
`InvalidArgumentException` otherwise) — grouping only makes sense on a sorted column,
since it partitions *contiguous* runs, not a full re-bucketing.

**Scope: single-page, client-side partitioning — not a cross-page aggregate.** The
client (`rowGroups.tsx`/`partitionRowGroups`) groups whatever rows are on the current
page after they arrive; a value split across two pages renders as two separate group
runs, one per page. This is intentionally not a server-side `GROUP BY` or a
cross-page rollup. Grouping is also v1-incompatible with drag-reorder: `grid.tsx` skips
grouping entirely while reorder is active (`groupsActive = Boolean(groups) &&
!reorderActive`), since the group partition would fight the optimistic drag order.

```php
$s->table('posts')
    ->defaultSort('published', 'desc')
    ->groups('published') // requires defaultSort('published', ...) above
```

#### `softDeletes()` — soft-delete convenience layer

For a model using the `SoftDeletes` trait, `->softDeletes($s, Model::class)` composes
existing primitives in one call:

- **Tabs (prepended):** `active` (default — the global SoftDeletes scope hides trashed
  rows), `trashed` (`onlyTrashed()`), `withTrashed` (`withTrashed()`). Labels: Active /
  Trashed / All. `active` lands first so it is the default tab.
- **Row actions (appended):** `RestoreAction` (gray) + `ForceDeleteAction` (danger, confirmed).
- **Bulk actions (appended):** `restoreSelected` + `forceDeleteSelected`.

Everything **merges** with config already set — call `->softDeletes()` **after** your own
`tabs()`/`rowActions()`/`bulkActions()`, never before. Opt parts out with
`['rowActions' => false, 'bulkActions' => false, 'tabs' => false]`.

The restore/force handlers reach hidden rows explicitly via `Model::withTrashed()` — the
tab query closures ride the existing `TableQuery::applyTab` seam (no table-query change).
The first parameter is the `S` builder: the helpers register their actions in the
request-scoped action registry the HTTP layer dispatches by name.

```php
// from apps/demo/app/Admin/Pages/SoftDeletesDemoPage.php
$s->table('posts')
    ->columns([Column::make('title')->label('Title')->translatable()])
    ->query(fn () => Post::query())
    ->rowActions([
        $s->action('delete')->label('Delete')->color('danger')
            ->confirm('Delete post?', 'It moves to the Trashed tab.')
            ->handle(fn ($ctx) => Effects::make()->refreshTable('posts'), needs: ['row']),
    ])
    ->softDeletes($s, Post::class) // tabs + restore/forceDelete, merged after delete
    ->toNode(),
```

`RestoreAction` / `ForceDeleteAction` (in `Tbtop\Admin\Dsl\Actions`) are also usable
standalone: `RestoreAction::make($s, Model::class)`, `::bulk(...)`,
`ForceDeleteAction::make(...)`, `::bulk(...)`. Each returns an `ActionBuilder`, so
label/icon/color stay chainable.

### Column

Instantiate with `Column::make(string $name)`.

**Core methods:**

| Method | Signature | Purpose |
|---|---|---|
| `label` | `label(string $label): static` | Column header text |
| `kind` | `kind(string $kind): static` | Display kind: `'text'`, `'date'`, `'datetime'`, `'time'`, `'number'`, `'money'`, `'boolean'`, `'badge'`, `'icon'` |
| `sortable` | `sortable(bool $sortable = true): static` | Enables sort on this column |
| `searchable` | `searchable(bool $searchable = true): static` | Includes this column in global search |
| `individuallySearchable` | `individuallySearchable(bool $value = true): static` | Adds a per-column search input in the table header, debounced independently of the global search box |
| `toggleable` | `toggleable(bool $toggleable = true, bool $hiddenByDefault = false): static` | User can toggle column visibility; optionally hide by default |
| `hidden` | `hidden(): static` | Always exclude from wire and projection |
| `visible` | `visible(Closure $closure): static` | Conditional visibility; closure returns bool |
| `align` | `align(string $align): static` | `'left'`\|`'center'`\|`'right'` |
| `icon` | `icon(string $name, string $position = 'left'): static` | Lucide icon alongside the cell value |
| `width` | `width(string $width): static` | CSS width string |
| `wrap` | `wrap(): static` | Wrap long values |
| `truncate` | `truncate(): static` | Truncate long values (default behavior) |
| `tooltip` | `tooltip(string $tooltip): static` | Hover tooltip |
| `translatable` | `translatable(bool $value = true): static` | Mark as a translatable column |
| `formatUsing` | `formatUsing(Closure $fn): static` | Custom server-side cell formatter |

**Kind-sugar methods** (set `kind` and store format metadata):

| Method | Signature | Notes |
|---|---|---|
| `date` | `date(?string $format = null): static` | Optional PHP date format string |
| `datetime` | `datetime(?string $format = null): static` | Optional PHP date format string |
| `time` | `time(?string $format = null): static` | Optional PHP date format string; defaults to `'H:i'` |
| `number` | `number(?int $decimals = null): static` | Optional decimal places |
| `money` | `money(string $currency): static` | ISO currency code, e.g. `'USD'` |
| `boolean` | `boolean(?string $trueIcon = null, ?string $falseIcon = null, Color\|string\|null $trueColor = null, Color\|string\|null $falseColor = null): static` | Icon/color overrides optional |
| `badge` | `badge(array $colors): static` | `['value' => Color\|string]` map |
| `iconMap` | `iconMap(array $map): static` | `['value' => ['icon' => '...', 'color' => '...']]` or `['value' => 'icon-name']` |

```php
// from apps/demo/app/Admin/Pages/PostsIndexPage.php
Column::make('published')
    ->label('Status')
    ->badge(['1' => Color::Success, '0' => Color::Gray])
    ->toggleable(),

Column::make('published_at')
    ->label('Published')
    ->date('Y-m-d')
    ->sortable()
    ->toggleable(true, true), // toggleable, hidden by default

Column::make('published_time')
    ->time('H:i')
    ->label('Published time'),
```

#### `individuallySearchable()` — per-column search

Each `individuallySearchable()` column gets its own search box in the table header
(`ColumnSearchInput`), separate from the table's global search. Every instance debounces
independently (300ms) — typing in one column's box never resets another's timer. Values
persist in the URL under `t[{table}][colSearch][{column}]`, alongside `filters`/`search`.

### ActionBuilder

Instantiate via `$s->action(string $name)`. Every action needs exactly one spec method
(`visit`, `submit`, `handle`, `modal`, or `custom`) — calling two throws.

| Method | Signature | Purpose |
|---|---|---|
| `label` | `label(string $label): self` | Button label |
| `color` | `color(string $color): self` | Button color, e.g. `'primary'`, `'danger'` |
| `keybinding` | `keybinding(string $keys): self` | Keyboard shortcut, e.g. `'mod+s'` |
| `visit` | `visit(string $href): self` | **Spec.** Client-side navigation to a static URL |
| `submit` | `submit(?string $form = null): self` | **Spec.** Submit a form; optional form name (defaults to the enclosing form) |
| `handle` | `handle(Closure $handler, array $needs = []): self` | **Spec.** Server action handler; `$needs` declares payload sources (`'form'`\|`'row'`\|`'selection'`) |
| `modal` | `modal(string $title, Node\|FormBuilder\|null $body = null, ?string $description = null): self` | **Spec.** Opens a modal dialog |
| `size` | `size(string $size): self` | Modal dialog size: `'sm'`\|`'md'`\|`'lg'`\|`'full'`; only valid after `modal()` |
| `query` | `query(callable $fn, array $needs = ['row']): static` | Backend data source for a modal; emits `query: true` + `queryNeeds`. The closure runs on open and feeds the modal body (a form prefills from it). Only valid after `modal()` |
| `confirm` | `confirm(string $title, ?string $description = null): self` | Adds a confirmation dialog before the action fires |
| `custom` | `custom(string $handler, array $params = []): self` | **Spec.** Delegates to a named client-side handler |

### Prebuilt action presets (`Tbtop\Admin\Dsl\Actions`) — and why to reach for them

Thin factories over `$s->action()` + `Effects` for the common record operations. They save
you the danger-color + confirm + needs-wiring boilerplate and return a **chainable**
`ActionBuilder`, so you keep the full fluent API. Reach for these before hand-rolling a
delete/edit/clone — they bake in the right defaults and stay overridable.

**The registry mandate (read this first).** Every preset takes `S $s` as its first argument
for one non-negotiable reason: it builds the action via `$s->action()`, which both *creates*
and *registers* the builder in the request-scoped action registry that the HTTP layer
dispatches by name. **A bare `ActionBuilder` (one constructed without going through `$s`)
404s at dispatch** — the server cannot find its handler. So never `new ActionBuilder(...)`
for a server action; always go through `$s->action()` or a preset that does.

| Preset | Signature | Shape |
|---|---|---|
| `EditAction` | `make(S $s, FormBuilder $form, Closure $loadUsing, Closure $saveUsing, string $name = 'edit', string $title = 'Edit record', ?string $saveName = null): ActionBuilder` | Modal + `query` (preload). `$form` holds fields only — the helper appends an inner Save+Cancel `actionsRow`. `$loadUsing` keys must match field names; `$saveUsing` runs the update (void → notify+closeModal+refreshTable) |
| `DeleteAction` | `make(S $s, Closure $using, string $name = 'delete', bool $bulk = false): ActionBuilder` | Danger + confirm server action; `$using` deletes. `bulk: true` switches to `needs: ['selection']` (empty selection → benign notify) |
| `ReplicateAction` | `make(S $s, Closure $using, string $name = 'replicate'): ActionBuilder` | Server action; `$using` clones. No auto-redirect — return a `redirect` effect from `$using` for edit-after-clone |
| `RestoreAction` / `ForceDeleteAction` | `make(S $s, string $model): ActionBuilder`, `::bulk(...)` | Soft-delete row/bulk actions; usually applied for you by `->softDeletes()` |
| `FormActions` | `save(S $s, string $label = 'Save'): ActionBuilder` · `saveCancel(S $s, string $cancelUrl, string $saveLabel = 'Save', array $extra = []): Node` | Form-footer button presets — a single submit, or a Save+Cancel row |

`DeleteAction` in a row and a bulk action, straight from the demo:

```php
// apps/demo/app/Admin/Pages/PostsIndexPage.php:165-178
DeleteAction::make($s, name: 'delete', using: function (ActionCtx $ctx): void {
    Post::whereKey($ctx->row['id'] ?? null)->delete();
}),
// bulk — empty selection is a benign notify; the closure overrides the tail:
DeleteAction::make($s, name: 'delete-selected', bulk: true, using: function (ActionCtx $ctx): Effects {
    $count = Post::whereKey($ctx->selection)->delete();

    return Effects::make()->notify("Deleted {$count} post(s)")->refreshTable('posts');
}),
```

`ReplicateAction` returns a `redirect` from its own closure to edit the clone:

```php
// apps/demo/app/Admin/Pages/PostsIndexPage.php:154-163
ReplicateAction::make($s, using: function (ActionCtx $ctx): Effects {
    $clone = Post::query()->whereKey($ctx->row['id'] ?? null)->firstOrFail()->replicate();
    $clone->slug = $clone->slug.'-copy-'.uniqid();
    $clone->save();

    return Effects::make()->notify('Post replicated')->redirect("/admin/posts/{$clone->id}/edit");
}),
```

#### `FormActions` — form-footer button presets

`FormActions` removes the boilerplate `actionsRow([... submit() ..., ... visit() ...])` at
the bottom of a form. Two entry points:

- **`FormActions::save($s, $label = 'Save'): ActionBuilder`** — a single primary submit
  button (with the `mod+s` keybinding). Returns a chainable `ActionBuilder`, so wrap it in
  your own `actionsRow` or chain more on it.
- **`FormActions::saveCancel($s, $cancelUrl, $saveLabel = 'Save', $extra = []): Node`** — a
  complete footer `Node`: a primary Save submit plus a Cancel button that `visit()`s
  `$cancelUrl`. `$extra` is a list of additional `ActionBuilder`s appended to the row. Drop
  the returned `Node` straight into the form's children.

```php
// equivalent to the create form's footer, using the preset
$s->form('post', [
    ...$this->postFormSections($s, 'unique:posts,slug'),
    FormActions::saveCancel($s, '/admin/posts', saveLabel: 'Create'),
])
```

The hand-rolled version this replaces is `PostCreatePage.php:31-35` (a `save` submit + a
`cancel` visit inside an `actionsRow`). Because `FormActions::save` routes through `$s`, the
submit action is registered like any other — the registry mandate above holds.

`RecordAction` (same namespace) is the shared internal the server presets build on:
`server()` / `bulk()` wire the server-action-with-default-tail, and a void/null closure
falls back to that tail. You rarely call it directly.

#### Worked example — `EditAction` modal with load/save

```php
// apps/demo/app/Admin/Pages/PostsIndexPage.php:126-152
EditAction::make(
    $s,
    name: 'editPublication',
    title: 'Edit publication',
    saveName: 'savePublication',
    form: $s->form('postPublication', [
        $s->boolean('published')->label('Published')->rules('boolean'),
        $s->date('published_at')->label('Published at')
            ->rules('nullable|date')->hiddenIf('published', '=', false),
    ]),
    loadUsing: fn (ActionCtx $ctx): array => Post::query()
        ->whereKey($ctx->row['id'] ?? null)->firstOrFail()
        ->only(['published', 'published_at']),
    saveUsing: function (ActionCtx $ctx): Effects {
        Post::whereKey($ctx->row['id'] ?? null)->update([
            'published' => (bool) ($ctx->form['published'] ?? false),
            'published_at' => $ctx->form['published_at'] ?? null,
        ]);

        return Effects::make()->notify('Publication updated')->closeModal()->refreshTable('posts');
    },
)->label('Publication')->hiddenIf('published', '=', false)
```

See the full round-trip walkthrough in
[recipes.md](./recipes.md) (Recipe 6).

### Tab

Instantiate with `Tab::make(string $name)`. Passed to `TableBuilder::tabs()`.

| Method | Signature | Purpose |
|---|---|---|
| `label` | `label(?string $label): self` | Tab label (defaults to the name) |
| `query` | `query(Closure $query): self` | Query scope applied when this tab is active |
| `count` | `count(bool $count = true): self` | Show a row-count badge on the tab (off by default) |

```php
// from apps/demo/app/Admin/Pages/PostsIndexPage.php
Tab::make('published')->label('Published')
    ->query(fn ($q) => $q->where('published', true)),

Tab::make('draft')->label('Draft')
    ->query(fn ($q) => $q->where('published', false))
    ->count(),
```

### Stat

Instantiate with `Stat::make(string $label)` (or via `$s->stat(string $label)`).

| Method | Signature | Purpose |
|---|---|---|
| `value` | `value(mixed $value): self` | Scalar value or `Closure` resolved at render time |
| `description` | `description(?string $description): self` | Sub-label beneath the value |
| `delta` | `delta(string $text, string $direction): self` | Trend indicator; `$direction` is `'up'`\|`'down'`\|`'flat'` |
| `icon` | `icon(string $lucideName): self` | Lucide icon name |
| `color` | `color(Color\|string $color): self` | Accent color |
| `sparkline` | `sparkline(array $numbers): self` | List of numbers rendered as a mini sparkline |

Call `->toNode()` to embed a `Stat` in a layout node.

```php
// from apps/demo/app/Admin/Pages/DashboardPage.php
Stat::make('Total Posts')
    ->value(fn () => DB::table('posts')->count())
    ->description('All time')
    ->icon('file-text')
    ->color(Color::Primary)
    ->toNode()
```

### ChartBuilder

Returned by `$s->chart(string $name, string $type, array $opts = [])`. The `$type`
drives the recharts component on the client (`'bar'`, `'donut'`, etc.).

| Method | Signature | Purpose |
|---|---|---|
| `query` | `query(Closure $query): self` | Server-side data resolver; marks the chart as dynamic (fetched via the page data endpoint) |
| `params` | `params(array $fields): self` | Filter fields rendered above the chart; values passed to the query closure |
| `set` | `set(string $key, mixed $value): self` | Set any extra option key on the node |

Static data can be embedded directly in `$opts` (no `query()` call needed). Call
`->toNode()` when the builder is used inside a layout.

---

## Effects — closed set

A server action or `onSubmit` handler must return an `Effects` instance. Effects are
chained; all declared effects execute in order on the client.

```php
return Effects::make()
    ->notify('Saved')
    ->refreshTable('posts');
```

The full set is **closed** — do not add new effect kinds to this package. If you
need client behavior outside this list, use `->custom()` on an `ActionBuilder` with
a named client-side handler, or let the server do a full Inertia redirect.

| Method | Signature | What the client does |
|---|---|---|
| `notify` | `notify(string $message, string $kind = 'success'): self` | Shows a toast notification; `$kind` controls the style (e.g. `'success'`, `'error'`) |
| `redirect` | `redirect(string $href): self` | Navigates to the given URL (Inertia visit) |
| `refreshTable` | `refreshTable(?string $table = null): self` | Re-fetches the named table; `null` refreshes the first/only table on the page |
| `resetForm` | `resetForm(?string $form = null): self` | Resets the named form to its `record` state; `null` resets the first/only form |
| `closeModal` | `closeModal(): self` | Closes the currently open modal dialog |

---

## Effects vs server redirect vs string href — which to return

A submit/action handler can move the user three different ways. Pick by **where the
navigation decision is made**:

| You want… | Return | When |
|---|---|---|
| Stay on the page, show a toast / refresh a table | `Effects::make()->notify(...)` (no redirect) | The common case — save in place |
| Navigate after a server decision | `Effects::make()->redirect($url)` | You computed the URL from data only the server has (the new record's id) |
| Navigate to a fixed, known URL on a **button** (no server work) | `->visit($url)` on the action (a spec, not a handler) | A Cancel/Back button — pure client navigation, no round-trip |
| Redirect straight out of `onSubmit` | **return a string** (the URL) | A create form that lands on the new edit page |

The two redirect forms are not interchangeable:

**`onSubmit` returning a string** — an Inertia redirect, used by the create form to jump to
the freshly-created record:

```php
// apps/demo/app/Admin/Pages/PostCreatePage.php:49-53
->onSubmit(function (ActionCtx $ctx): string {
    $post = Post::create($ctx->form);

    return "/admin/posts/{$post->id}/edit";   // string return = redirect
})
```

`MediaNewPage` returns a string the same way (`return '/admin/media';`,
`apps/demo/app/Admin/Pages/MediaNewPage.php:51`).

**A handler returning a `redirect` effect** — used by the edit page's delete action, which
notifies *and* navigates:

```php
// apps/demo/app/Admin/Pages/PostEditPage.php:52-56
->handle(function (ActionCtx $ctx): Effects {
    Post::whereKey($ctx->request->route('post'))->delete();

    return Effects::make()->notify('Post deleted')->redirect('/admin/posts');
})
```

Rule of thumb: a **string return** is a bare redirect (no toast). An **`Effects` redirect**
lets you chain a `notify` (or `refreshTable`) alongside the navigation. A **`visit()` spec**
is for buttons that never touch the server. Do not invent a new effect to navigate — the
three forms above cover every case (the effect set is closed).

---

## Conditional visibility — `Cond` builder vs string shorthand

Fields and columns can show/hide/enable/disable based on other field values, evaluated
**client-side** in real time. There are two ways to express the condition, and they produce
the same wire shape:

**String shorthand** — `->hiddenIf('field', 'op', value)` / `->disabledIf('field', 'op', value)`.
Use for a single comparison. The operators are `=` `!=` `>` `>=` `<` `<=`:

```php
// apps/demo/app/Admin/Pages/Concerns/PostFormFields.php:34-35
$s->date('published_at')->label('Published at')->rules('nullable|date')
    ->hiddenIf('published', '=', false),   // hide the date until "published" is on
```

```php
// apps/demo/app/Admin/Pages/Concerns/PostFormFields.php:74-75 (inside a repeater)
$s->text('url')->label('URL')
    ->hiddenIf('type', '!=', 'link'),      // only show URL when type === 'link'
```

The same shorthand drives a row action's visibility — the demo hides the publication modal
on rows that are already drafts:

```php
// apps/demo/app/Admin/Pages/PostsIndexPage.php:152
->label('Publication')->hiddenIf('published', '=', false)
```

**`Cond` builder** — `Cond::all(...)` / `Cond::any(...)` / `Cond::not(...)` wrapping leaf
conditions (`Cond::truthy('f')`, `Cond::eq('f', v)`, `Cond::neq`, `Cond::in`, `Cond::gt`, …).
Use when you need a combinator (AND / OR / NOT) or a leaf the shorthand has no symbol for
(`truthy`, `empty`, `notEmpty`, `in`, `notIn`):

```php
// apps/demo/app/Admin/Pages/Concerns/PostFormFields.php:36-39
Rating::make('rating')->label('Rating')->max(5)
    ->set('min', 0)->set('step', 0.1)
    ->rules('nullable|numeric|min:0|max:5')
    ->disabledIf(Cond::not(Cond::truthy('published'))),  // enabled only when published
```

`->disabledIf('published', '=', false)` would be *almost* the same, but `Cond::truthy`
treats `0`/`''`/`null` uniformly as falsy — the shorthand `=` compares to one literal. Reach
for `Cond` when "is this field set/on at all" matters more than one exact value, or when the
condition is a boolean combination of several fields.

`hiddenIf`/`disabledIf` both accept **either** a `Cond` instance **or** the
`(field, op, value)` string triple as their first argument — the signature is
`hiddenIf(Cond|string $condOrField, string $op = '', mixed $value = null)`.

---

## Action handler context

Every server action handler and `onSubmit` closure receives an `ActionCtx`:

```php
->handle(function (ActionCtx $ctx): Effects {
    // $ctx properties available based on `needs`:
    // $ctx->request   — the Illuminate Request
    // $ctx->user      — authenticated user (Authenticatable|null)
    // $ctx->form      — array<string, mixed>  (needs: ['form'])
    // $ctx->row       — array<string, mixed>  (needs: ['row'])
    // $ctx->selection — list<int|string>      (needs: ['selection'])
    // $ctx->params    — array<string, string> (route params, always present)
}, needs: ['row'])
```

The `needs` array on `handle()` tells the HTTP layer which payload sources to populate.
Declare only what you use; unpopulated sources arrive as empty arrays.

Route params (`$ctx->params`) come from the page URL and are always present —
they are derived server-side and trusted over anything the client sends.

**Delete action with row context** (from `apps/demo/app/Admin/Pages/PostsIndexPage.php`):

```php
$s->action('delete')->label('Delete')->color('danger')
    ->confirm('Delete post?', 'This cannot be undone.')
    ->handle(function (ActionCtx $ctx): Effects {
        Post::whereKey($ctx->row['id'] ?? null)->delete();

        return Effects::make()->notify('Post deleted')->refreshTable('posts');
    }, needs: ['row'])
```

**Bulk action with selection** (from `apps/demo/app/Admin/Pages/PostsIndexPage.php`):

```php
$s->action('delete-selected')->label('Delete selected')->color('danger')
    ->confirm('Delete selected posts?', 'This cannot be undone.')
    ->handle(function (ActionCtx $ctx): Effects {
        $count = Post::whereKey($ctx->selection)->delete();

        return Effects::make()
            ->notify("Deleted {$count} post(s)")
            ->refreshTable('posts');
    }, needs: ['selection'])
```

---

## Worked example

The following is the settings page from `apps/demo/app/Admin/Pages/SettingsPage.php`,
a complete page with nav registration, a form, pre-filled record, and an `onSubmit`
handler that persists the data and notifies the user.

```php
use App\Models\Setting;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class SettingsPage extends Page
{
    public static function path(): string
    {
        return 'settings';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Site settings', 'order' => 1];
    }

    public function title(): string
    {
        return 'Site settings';
    }

    public function view(S $s): Node
    {
        $settings = Setting::firstOrCreate([]);

        return $s->stack([
            $s->displayText('Site Settings')->variant('heading'),
            $s->displayText('Manage your site configuration below.')->variant('muted'),
            $s->displayAlert('Changes are applied immediately after saving.')
                ->title('Heads up')
                ->color(Color::Info),
            $s->displayDivider(),
            $s->form('settings', [
                $s->section(['title' => 'Site'], [
                    $s->text('site_name')->label('Site name')->required()->rules('max:200'),
                    $s->text('tagline')->label('Tagline'),
                ]),
                $s->section(['title' => 'Operations'], [
                    $s->boolean('maintenance_mode')->label('Maintenance mode')->rules('boolean'),
                    $s->number('max_upload_mb')->label('Max upload (MB)')
                        ->set('min', 0)->set('step', 1)
                        ->required()->rules('integer|min:0'),
                    $s->date('launch_date')->label('Launch date')->rules('nullable|date'),
                ]),
                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')
                        ->keybinding('mod+s')->submit(),
                ]),
            ])
                ->record($settings->toArray())
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    Setting::firstOrCreate([])->update($ctx->form);

                    return Effects::make()->notify('Saved');
                }),
        ]);
    }
}
```

For a table-based page (index with row/bulk actions, filters, and tabs), see
`apps/demo/app/Admin/Pages/PostsIndexPage.php`. For a form with route params,
delete actions, and redirect effects, see `apps/demo/app/Admin/Pages/PostEditPage.php`.
