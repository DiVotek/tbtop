# Authoring Admin Pages

> Part of the AI authoring guide. Start at [./README.md](./README.md).

This reference covers the PHP-DSL side of building admin pages: the `Page` base class,
the `S` builder catalog, every builder's public API, the closed effect set, and the
action handler context. Field details live in [./fields.md](./fields.md). HTTP transport,
the contract pipeline, and endpoint wiring live in [./wiring.md](./wiring.md). Composed
patterns (relation managers, soft-delete) live in [./recipes.md](./recipes.md).

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
| `tabs` | `tabs(array $tabs, array $opts = []): Node` | Tab container; each tab is `['label' => '...', 'body' => ...]` |
| `actionGroup` | `actionGroup(string $label, array $actions, ?string $as = null): Node` | Button group or dropdown; `$as` is `'buttons'`\|`'dropdown'` (default `'buttons'`) |

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
| `tabs` | `tabs(array $tabs): self` | Predefined query-scope tabs; first tab is the default |
| `defaultSort` | `defaultSort(string $field, string $dir = 'asc'): self` | Default sort column and direction |
| `paginate` | `paginate(int $perPage = 25, array $options = [10, 25, 50, 100]): self` | Pagination config |
| `rowActions` | `rowActions(array $actions): self` | Per-row action buttons; `ActionBuilder` instances |
| `rowClick` | `rowClick(string $actionName): self` | Name of a row action to trigger when the row is clicked |
| `bulkActions` | `bulkActions(array $actions): self` | Checkbox bulk-select actions; `ActionBuilder` instances |
| `softDeletes` | `softDeletes(S $s, string $model, array $options = []): self` | Soft-delete convenience layer (see below) |

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
| `kind` | `kind(string $kind): static` | Display kind: `'text'`, `'date'`, `'datetime'`, `'number'`, `'money'`, `'boolean'`, `'badge'`, `'icon'` |
| `sortable` | `sortable(bool $sortable = true): static` | Enables sort on this column |
| `searchable` | `searchable(bool $searchable = true): static` | Includes this column in global search |
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
```

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

### Prebuilt CRUD action helpers (`Tbtop\Admin\Dsl\Actions`)

Thin factories over `$s->action()` + `Effects` for the common record operations.
Each takes `S $s` first (so it registers in the action registry) and **returns the
configured `ActionBuilder`**, so you keep chaining (`->color()`, `->hiddenIf()`, …).
No model is baked in — the consumer passes the closure. Filament-familiar.

| Helper | Signature | Shape |
|---|---|---|
| `EditAction` | `make(S $s, FormBuilder $form, Closure $loadUsing, Closure $saveUsing, string $name = 'edit', string $title = 'Edit record', ?string $saveName = null): ActionBuilder` | Modal + `query` (preload). `$form` holds fields only — the helper appends an inner Save+Cancel `actionsRow`. `$loadUsing` keys must match field names; `$saveUsing` runs the update (void → notify+closeModal+refreshTable) |
| `DeleteAction` | `make(S $s, Closure $using, string $name = 'delete', bool $bulk = false): ActionBuilder` | Danger + confirm server action; `$using` deletes. `bulk: true` switches to `needs: ['selection']` (empty selection → benign notify) |
| `ReplicateAction` | `make(S $s, Closure $using, string $name = 'replicate'): ActionBuilder` | Server action; `$using` clones. No auto-redirect — return a `redirect` effect from `$using` for edit-after-clone |

`RecordAction` (same namespace) is the shared internal: `server()` / `bulk()` wire the
server-action-with-default-tail the presets build on; a void/null closure falls back to
the tail.

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
