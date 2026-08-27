# Composition Recipes

> Back to [./README.md](./README.md)

Before concluding a feature is missing, check here — many Filament-named features compose
from existing primitives.

**Every recipe in this file is verified against source.** Unverified ideas that cannot be
confirmed to work today live in the [Not yet expressible](#not-yet-expressible) section and
are never presented as working recipes. If you think you need something not listed here,
check [./authoring-pages.md](./authoring-pages.md) and [./fields.md](./fields.md) before
concluding a new primitive is needed.

---

## Recipe 1 — Relation managers (manage rows related to a record)

**What Filament calls it:** a Relation Manager — a tab on the edit page that lists related
rows and lets you add, edit, or delete them inline.

**How it works here:** a page's `view()` may contain more than one `$s->table(...)` call.
Each table is an independent, fully-featured data block with its own query, columns, row
actions, and bulk actions. On a record's edit page, place the record form first, then one or
more tables scoped to the related rows via `->query()`.

### Proof that N tables render

`apps/demo/app/Admin/Pages/PostsIndexPage.php` renders **two tables on one page** — a
`posts` table (lines 43-137) followed by a `users` table (line 138-147) — both wired through
a single `$s->stack([...])` call. The maintainer has manually confirmed that both tables
render and function. Note: the second table in that file has wrong columns for the `User`
model (a known bug in the demo) — it is cited here only as proof of the N-table mechanism,
not as a clean column example.

### The relation-manager shape (illustrative — scope the query to your parent record)

On a record edit page, call `$s->form(...)` for the parent record, then `$s->table(...)`
for each relation you want to manage:

```php
public function view(S $s): Node
{
    $record = Post::findOrFail(request()->route('post'));

    return $s->stack([
        $s->form('post', [...]),   // parent record form

        // "Relation manager" — a table scoped to the parent record
        $s->table('comments')
            ->query(fn () => $record->comments()->getQuery())
            ->columns([
                Column::make('body')->label('Comment')->kind('text'),
                Column::make('created_at')->label('Posted')->date('Y-m-d'),
            ])
            ->rowActions([
                $s->action('delete')->label('Delete')->color('danger')
                    ->confirm('Delete comment?', 'This cannot be undone.')
                    ->handle(function (ActionCtx $ctx): Effects {
                        Comment::whereKey($ctx->row['id'])->delete();
                        return Effects::make()
                            ->notify('Comment deleted')
                            ->refreshTable('comments');
                    }, needs: ['row']),
            ])
            ->bulkActions([
                $s->action('delete-selected')->label('Delete selected')
                    ->color('danger')
                    ->handle(function (ActionCtx $ctx): Effects {
                        Comment::whereKey($ctx->selection)->delete();
                        return Effects::make()
                            ->notify('Comments deleted')
                            ->refreshTable('comments');
                    }, needs: ['selection']),
            ]),
    ]);
}
```

The key methods are verified in source:

- `->query(Closure $query)` — `TableBuilder.php` line 71; the closure returns any Eloquent
  builder, including a relation query from a loaded record.
- `->rowActions(array $actions)` — `TableBuilder.php` line 195.
- `->bulkActions(array $actions)` — `TableBuilder.php` line 214.

This snippet is illustrative. No demo page wires a real relation yet (maintainer decision for
this wave) — but the primitives that make it work are confirmed present and functional.

See [./authoring-pages.md](./authoring-pages.md) for the full `TableBuilder` surface, and
[./wiring.md](./wiring.md) for how table data endpoints are called.

---

## Recipe 2 — Infolist / read-only detail view (static content)

**What Filament calls it:** an Infolist — a display-only view of a record's fields.

**What exists today:** The DSL has a set of static display blocks that can compose a
read-only page. A page whose `view()` returns only display blocks (no form) is a working
pattern today.

Available display primitives (all in `S.php`, confirmed):

| Method | Kind on wire | Use |
|---|---|---|
| `$s->displayText($content)->variant('heading')` | `displayText` | Section headings (variants: `heading`, `subheading`, `body`, `muted`) |
| `$s->displayText($content)` | `displayText` | Body copy |
| `$s->displayHtml($rawHtml)` | `displayHtml` | Pre-rendered HTML |
| `$s->markdown($content)` | `displayHtml` | Markdown converted server-side to HTML |
| `$s->displayAlert($message)` | `displayAlert` | Callout / info box |
| `$s->displayDivider()` | `displayDivider` | Visual separator |
| `$s->displayValue($value)->badge([...])` | `displayValue` | One value rendered as badge / boolean-icon / icon / money / date / datetime / number (mirrors the table `Column` kind-model) |
| `$s->displayImage($url)` | `displayImage` | Full-size image (`->alt()`/`->caption()`) or a file-download link (`->asLink()`) |
| `$s->displayRichtext($state)` | `displayRichtext` | Read-only render of a stored Lexical `SerializedEditorState` |
| `$s->displayKeyValue($map)` | `displayKeyValue` | `<dl>` map of key/value pairs |

Example — a record detail page (the demo's `RecordDetailPage` is the full version):

```php
public function view(S $s): Node
{
    $order = Order::findOrFail(request()->route('order'));

    return $s->stack([
        $s->displayText("Order #{$order->id}")->variant('heading'),
        $s->section(['title' => 'Summary'], [
            $s->displayValue($order->status)->badge(['paid' => Color::Success]),
            $s->displayValue($order->shipped)->boolean(),
            $s->displayValue($order->total_cents)->money('USD'),
            $s->displayValue($order->placed_at)->date('Y-m-d'),
        ]),
        $s->displayImage($order->cover_url)->alt('Cover'),
        $s->displayRichtext($order->notes),
        $s->displayKeyValue(['SKU' => $order->sku, 'Weight' => $order->weight]),
    ]);
}
```

**This replaces the old "infolist" gap.** The display-value family (`displayValue` +
`displayImage`/`displayRichtext`/`displayKeyValue`, M-96) covers field-driven detail by a
deliberate *author-renders-directly* model: you hold the record and pass each value to a
block, rather than declaring `TextEntry::make('title')` bindings. There is intentionally no
binding/resolution layer — the author owns the data access, the block owns the rendering.
`displayValue` reuses the table column's date/number/money formatting (via `KindFormat`),
so a value formats identically in a cell and a detail view.

---

## Recipe 3 — Soft-delete table

**What Filament calls it:** soft-delete support built into the Resource — trashed filter,
restore action, force-delete action, automatic scoping.

**What exists today:** the `->softDeletes($s, Model::class)` macro on `TableBuilder` ships
this — active/trashed/all tabs plus restore/forceDelete row and bulk actions. See the
"Soft-delete macro" section in [./authoring-pages.md](./authoring-pages.md). The hand-rolled
version below is kept to show how it composes from `->query()` + row/bulk actions; reach for
the macro in real code.

The three pieces you wire yourself:

1. **`->query()` with `withTrashed()` or `onlyTrashed()`** — scope is yours to control.
2. **A filter** that toggles between active / trashed / all (using a `Boolean` or `Select`
   filter with a `filterUsing()` closure).
3. **Row actions** for restore (`$record->restore()`) and force-delete
   (`$record->forceDelete()`).

```php
// Illustrative — not yet a demo page; primitives are confirmed
$s->table('posts')
    ->query(fn () => Post::withTrashed())
    ->filters([
        Boolean::make('trashed')
            ->label('Show trashed')
            ->filterUsing(fn ($q, $v) => $v ? $q->onlyTrashed() : $q->withoutTrashed()),
    ])
    ->rowActions([
        $s->action('restore')->label('Restore')
            ->handle(function (ActionCtx $ctx): Effects {
                Post::withTrashed()->whereKey($ctx->row['id'])->restore();
                return Effects::make()->notify('Restored')->refreshTable('posts');
            }, needs: ['row']),
        $s->action('force-delete')->label('Delete permanently')->color('danger')
            ->confirm('Permanently delete?', 'This cannot be undone.')
            ->handle(function (ActionCtx $ctx): Effects {
                Post::withTrashed()->whereKey($ctx->row['id'])->forceDelete();
                return Effects::make()->notify('Deleted')->refreshTable('posts');
            }, needs: ['row']),
    ])
```

**The caveat:** this requires the model to use `SoftDeletes`. All primitives used here are
confirmed in source (`->query()`, `->filters()`, `->rowActions()`, `->bulkActions()`). The
`->softDeletes()` macro wires all three automatically; the above is the hand-rolled
equivalent, kept for understanding how it composes.

---

## Recipe 4 — Dashboard widgets / stats overview

**What Filament calls it:** Dashboard widgets — stat cards, charts.

**Status: done.** `S.php` exposes `$s->stat()` and `$s->chart()`. These are fully wired
and documented under the authoring surface. No recipe needed here beyond the pointer.

See [./authoring-pages.md](./authoring-pages.md) for `stat()` and `chart()` options (value,
delta, sparkline, icon, color; line/bar/area/pie/donut chart types with runtime params).

---

## Recipe 5 — Full CRUD resource family (create → index → edit → soft-delete)

**What you want:** the four pages that make up a typical resource — a create form, an
index table, an edit form, and trashed-row management. The demo's `Post` resource is the
complete worked version; every snippet below is copied from it.

### 1. Create page — a form whose `onSubmit` returns a redirect string

`onSubmit` may return **a string** (an Inertia redirect URL) instead of `Effects`. The
demo uses this to land on the new record's edit page after create.

```php
// apps/demo/app/Admin/Pages/PostCreatePage.php:26-55
public function view(S $s): Node
{
    return $s->stack([
        $s->form('post', [
            ...$this->postFormSections($s, 'unique:posts,slug'),
            $s->actionsRow([
                $s->action('save')->label('Create')->color('primary')
                    ->keybinding('mod+s')->submit(),
                $s->action('cancel')->label('Cancel')->visit('/admin/posts'),
            ]),
        ])
            ->record([
                'title' => null, 'slug' => '', 'published' => false,
                'author_id' => null, 'sections' => [],
            ])
            ->onSubmit(function (ActionCtx $ctx): string {
                $post = Post::create($ctx->form);

                return "/admin/posts/{$post->id}/edit";
            }),
    ]);
}
```

The form fields live in a shared trait (`PostFormFields`) so create and edit reuse one
definition — the only difference is the slug's `unique` rule, passed in as an argument.

### 2. Index page — table with tabs, filters, sort, pagination, row + bulk actions

```php
// apps/demo/app/Admin/Pages/PostsIndexPage.php:41-247 (abridged)
$s->table('posts')
    ->rowClick('edit')
    ->columns([
        Column::make('title')->label('Title')->kind('text')
            ->translatable()->sortable()->searchable()->individuallySearchable(),
        Column::make('published')->label('Published')->badge([
            '1' => Color::Success, '0' => Color::Gray,
        ])->toggleable(),
        Column::make('published_time')->time('H:i')->label('Published time'),
        Column::make('views')->label('Views')->number()->sortable()->align('right'),
    ])
    ->filters([
        InFilter::make('published')->label('Status')->options([
            ['value' => '1', 'label' => 'Published'],
            ['value' => '0', 'label' => 'Draft'],
        ]),
        Daterange::make('published_at')->label('Published date'),
    ])
    ->filtersIn('modal')
    ->deferFilters()
    ->filtersFormColumns(2)
    ->tabs([
        Tab::make('all')->label('All'),
        Tab::make('published')->label('Published')
            ->query(fn ($q) => $q->where('published', true)),
        Tab::make('draft')->label('Draft')
            ->query(fn ($q) => $q->where('published', false))->count(),
    ])
    ->defaultSort('published', 'desc')
    ->groups('published')
    ->paginate(25, [10, 25, 50, 100])
    ->query(fn () => Post::query())
    ->rowActions([
        // Per-row edit needs the row id, so it is a redirect effect, not visit().
        $s->action('edit')->label('Edit')->handle(
            fn (ActionCtx $ctx): Effects => Effects::make()
                ->redirect("/admin/posts/{$ctx->row['id']}/edit"),
            needs: ['row'],
        ),
        DeleteAction::make($s, name: 'delete', using: function (ActionCtx $ctx): void {
            Post::whereKey($ctx->row['id'] ?? null)->delete();
        }),
    ])
    ->bulkActions([
        DeleteAction::make($s, name: 'delete-selected', bulk: true, using: function (ActionCtx $ctx): Effects {
            $count = Post::whereKey($ctx->selection)->delete();

            return Effects::make()->notify("Deleted {$count} post(s)")->refreshTable('posts');
        }),
    ])
    ->toNode()
```

`rowClick('edit')` makes a whole-row click fire the `edit` row action — note a per-row
URL cannot use `visit()` (a static string), so `edit` is a server `handle()` returning a
`redirect` effect built from `$ctx->row['id']`. `DeleteAction` is a prebuilt preset
(see [authoring-pages.md](./authoring-pages.md) presets section).

`individuallySearchable()` adds a per-column search box (independent debounce, own URL
state — see [authoring-pages.md](./authoring-pages.md#individuallysearchable--per-column-search)).
`deferFilters()->filtersFormColumns(2)` requires an explicit Apply before filter changes
narrow the query, laid out in a 2-column grid. `groups('published')` partitions rows into
group headers by that column's value — **single-page client-side partitioning only**, not
a cross-page aggregate; see [authoring-pages.md](./authoring-pages.md#groups--row-grouping)
for the full scope note.

### 3. Edit page — route param, save, delete-with-redirect

The edit page reads the route param, prefills the form via `->record()`, and its delete
action returns a `redirect` effect to bounce back to the index.

```php
// apps/demo/app/Admin/Pages/PostEditPage.php:27-66 (abridged)
public function view(S $s): Node
{
    $post = Post::findOrFail(request()->route('post'));

    return $s->stack([
        $s->form('post', [
            ...$this->postFormSections($s, "unique:posts,slug,{$post->id}"),
            $s->actionsRow([
                $s->action('save')->label('Save')->color('primary')
                    ->keybinding('mod+s')->submit(),
                $s->action('delete')->label('Delete')->color('danger')
                    ->confirm('Delete post?', 'This cannot be undone.')
                    ->handle(function (ActionCtx $ctx): Effects {
                        Post::whereKey($ctx->request->route('post'))->delete();

                        return Effects::make()->notify('Post deleted')->redirect('/admin/posts');
                    }),
                $s->action('cancel')->label('Cancel')->visit('/admin/posts'),
            ]),
        ])
            ->record($post->toArray())
            ->onSubmit(function (ActionCtx $ctx): Effects {
                Post::findOrFail($ctx->params['post'] ?? null)->update($ctx->form);

                return Effects::make()->notify('Saved');
            }),
    ]);
}
```

The route param is available two ways inside a handler: `$ctx->request->route('post')`
and `$ctx->params['post']`. Both are server-derived and trusted; the demo uses each.

### 4. Soft-delete tab — the `->softDeletes()` macro

Drop trashed-row management onto any table whose model uses the `SoftDeletes` trait. Call
`->softDeletes($s, Model::class)` **after** your own `rowActions()`/`tabs()` so it merges:

```php
// apps/demo/app/Admin/Pages/SoftDeletesDemoPage.php:38-56
$s->table('posts')
    ->columns([
        Column::make('title')->label('Title')->kind('text')->translatable()->searchable(),
        Column::make('published')->label('Published')->boolean(),
    ])
    ->searchable(['title'])
    ->defaultSort('id', 'desc')
    ->query(fn () => Post::query())
    ->rowActions([
        $s->action('delete')->label('Delete')->color('danger')
            ->confirm('Delete post?', 'It moves to the Trashed tab.')
            ->handle(function (ActionCtx $ctx): Effects {
                Post::whereKey($ctx->row['id'] ?? null)->delete();

                return Effects::make()->notify('Post deleted')->refreshTable('posts');
            }, needs: ['row']),
    ])
    ->softDeletes($s, Post::class) // tabs + restore/forceDelete, merged after delete
    ->toNode()
```

The macro prepends Active / Trashed / All tabs and appends restore + force-delete (row and
bulk) actions. Full behavior in the `softDeletes()` section of
[authoring-pages.md](./authoring-pages.md).

---

## Recipe 6 — Modal action with a query (load / save round-trip)

**What you want:** an edit-in-place modal that **preloads** the row's current values into a
form, then **saves** them back — without navigating to a separate page. The `EditAction`
preset wires the modal, the preload query, and the inner Save/Cancel buttons for you.

The two closures you supply are the round-trip:

- **`loadUsing`** runs when the modal opens. Its returned array keys **must match the form
  field names** — that is how the form prefills.
- **`saveUsing`** runs on Save. Return `Effects` to control the toast/refresh, or return
  `void` to accept the preset's default tail (notify + closeModal + refreshTable).

```php
// apps/demo/app/Admin/Pages/PostsIndexPage.php:174-200
EditAction::make(
    $s,
    name: 'editPublication',
    title: 'Edit publication',
    saveName: 'savePublication',
    form: $s->form('postPublication', [
        $s->boolean('published')->label('Published')->rules('boolean'),
        $s->date('published_at')->label('Published at')
            ->rules('nullable|date')
            ->hiddenIf('published', '=', false),
    ]),
    loadUsing: fn (ActionCtx $ctx): array => Post::query()
        ->whereKey($ctx->row['id'] ?? null)
        ->firstOrFail()
        ->only(['published', 'published_at']),
    saveUsing: function (ActionCtx $ctx): Effects {
        Post::whereKey($ctx->row['id'] ?? null)->update([
            'published' => (bool) ($ctx->form['published'] ?? false),
            'published_at' => $ctx->form['published_at'] ?? null,
        ]);

        return Effects::make()
            ->notify('Publication updated')
            ->closeModal()
            ->refreshTable('posts');
    },
)->label('Publication')->hiddenIf('published', '=', false)
```

Notes copied from the working page:

- The `form` argument holds **fields only** — `EditAction` appends the inner Save+Cancel
  `actionsRow` itself. Do not add your own.
- `loadUsing` returns `->only(['published', 'published_at'])`; those keys line up exactly
  with the two field names. A missing key just leaves that field at its default.
- The return value of `EditAction::make()` is still a chainable `ActionBuilder` — the demo
  chains `->label('Publication')->hiddenIf(...)` to relabel and hide it on drafts.
- For error handling, throw inside `saveUsing` (a `ValidationException` surfaces as field
  errors; any other throw becomes a server error toast). The preset does not swallow it.

---

## Recipe 7 — Inline-editable column (toggle + onSave)

**What you want:** edit a cell value directly in the table — flip a boolean, change a
select — without opening a form. Mark the column editable (`toggle()` for a boolean,
`textInput()` for text, `selectColumn()` for a select) and give it an `onSave` closure.

The `onSave` closure is special: it receives the **resolved model** and the **new value**,
not an `ActionCtx`. It runs the persistence and returns `Effects`.

```php
// apps/demo/app/Admin/Pages/PostsIndexPage.php:57-69
Column::make('published')
    ->label('Published')
    ->toggle()
    ->onSave(function (Post $post, bool $value): Effects {
        $post->update([
            'published' => $value,
            'published_at' => $value ? now() : null,
        ]);

        return Effects::make()
            ->notify($value ? 'Post published' : 'Post unpublished')
            ->refreshTable('posts');
    }),
```

Notes:

- `toggle()` sets `kind = 'boolean'` and marks the column inline-editable in one call. For
  text use `textInput()`, for a static select use `selectColumn()->options([...])`, for a
  number use `numberInput()->step('0.01')` — add `suffix('USD')` (or `prefix('$')`) for the
  unit; the cell shows the stored value raw so the editor can round-trip it. `money()` stays
  output-only.
- `onSave` is **required** on an editable column — omit it and the cell has nowhere to
  persist. The closure's first parameter is type-hinted to your model; the framework
  resolves the row to a model instance before calling it.
- Add `->rules('...')` on the column to validate the new value server-side before `onSave`
  runs — same Laravel rules as a form field.

---

## Recipe 8 — Theming and appearance

**What Filament calls it:** `->colors()`, `->font()`, `->brandLogo()`, `->maxContentWidth()`
on the panel.

**How it works here:** tbtop renders on **shadcn theme tokens** (the `--background` /
`--primary` / `--radius` … CSS variables). So you theme the whole admin — colors, radius,
shadows, fonts — the shadcn way: **edit those tokens in your app CSS**, not through a PHP
color API. There is deliberately no `->colors()` method — a runtime-injected `<style>` would
only add a flash of the default theme; the CSS file is the single source of truth.

### Theme by pasting a shadcn preset

Your admin entry loads one CSS file that holds the token values — in the demo that is
`apps/demo/resources/css/app.css` (its `:root { … }` and `.dark { … }` blocks). To re-theme,
build a palette at [ui.shadcn.com/create](https://ui.shadcn.com/create), copy its `:root`
and `.dark` blocks, and replace the token values in that file:

```css
:root {
  --radius: 0.75rem;
  --primary: hsl(221 83% 53%);
  --primary-foreground: hsl(0 0% 98%);
  /* …rest of the preset… */
}
.dark {
  --primary: hsl(217 91% 60%);
  /* …rest of the preset… */
}
```

Paste only the `:root` / `.dark` value blocks — drop the generator's `@import` and
`@theme inline` lines (those are build-time and already present). tbtop writes its own dark
tokens under `.dark` (not `html.dark`), so a pasted `.dark` block overrides cleanly in both
modes. The demo applies a sample blue-accent preset this way.

### Appearance knobs (the parts CSS can't express)

Three knobs live on `PanelConfig` because they drive client behavior or layout, not tokens:

```php
// apps/demo/app/Admin/AdminPanel.php
return $panel
    ->maxContentWidth('7xl')        // center page content (Tailwind max-w token)
    ->darkMode(true)                // false hides the theme toggle; shell stays light
    ->defaultThemeMode('system');   // initial theme when the visitor has no saved choice
```

- `maxContentWidth($token)` — `sm`…`7xl`, `full`, or `prose`; omit for full-bleed.
- `darkMode(false)` — removes the light/dark/system toggle and forces light (colors still
  come from your CSS).
- `defaultThemeMode($mode)` — `light` | `dark` | `system`, applied when there is no
  `tbtop_theme` cookie yet. To also kill the first-paint flash, mirror it in your root
  Blade's inline theme script (the host owns that `<head>`).

All three serialize sparsely into the `tbtop.appearance` shared prop — an unconfigured panel
ships nothing.

---

## Recipe 9 — Navigation configuration

**What Filament calls it:** `navigationParentItem()` (nested sidebar items), custom
`NavigationItem`s not tied to a resource, and profile-menu items.

**How it works here:** three independent mechanisms, all resolved by
`Tbtop\Admin\Navigation\NavBuilder` and rendered by the same nav components as
page-derived items.

### Nested nav (a page under another page)

A page's `nav()` array takes a `parent` key pointing at another `nav()`-eligible page class
in the same panel. `NavBuilder::build()` (`packages/php/src/Navigation/NavBuilder.php:17-19`)
nests it under the parent's item instead of listing it at the group's top level:

```php
// apps/demo/app/Admin/Pages/SettingsGeneralPage.php
public static function nav(): ?array
{
    return ['group' => 'System', 'label' => 'General', 'order' => 1, 'parent' => SettingsPage::class];
}
```

Two safety rules enforced at build time, not render time — a broken reference fails the
same way for every visitor rather than silently vanishing for some:

- **Unknown or cyclic `parent`** — a `parent` outside the panel's nav-eligible page set, or a
  parent cycle, throws `InvalidArgumentException`/`LogicException`
  (`NavBuilder.php:88-91` — `assertValidParents`).
- **Gated-out parent** — if the current user's gate fails the parent's `can()` but passes the
  child's, the child promotes to its own group's top level instead of disappearing
  (`NavBuilder.php:46-48`).

The client (`packages/client/src/app/navGroupSection.tsx:120-162`, `NavItemNode`) renders a
leaf item as a plain link; a parent (has `children`) renders its own link plus a chevron
that expands to indented children — the same collapse affordance as a group header. The
topbar layout nests the same way via a `DropdownMenuSub` (`navGroupDropdown.tsx`).

### Custom nav items (no page, no gate)

`PanelConfig::navigationItems()` (`packages/php/src/Panels/PanelConfig.php:211-223`) adds
always-shown entries — typically external links — merged into the built tree alongside
page-derived items and grouped by label the same way `navigationGroups()` matches groups.
Built from `Tbtop\Admin\Navigation\NavItem`, which has no page class and no per-request gate:

```php
// apps/demo/app/Admin/AdminPanel.php
->navigationItems([
    NavItem::make('Documentation')->url('https://github.com/DiVotek/tbtop')
        ->icon('globe')->group('Resources')->newTab(),
])
```

### User-menu items (profile dropdown)

`PanelConfig::userMenuItems()` (`PanelConfig.php:225-238`) takes the same `NavItem` links,
rendered in the profile dropdown between the identity header and the fixed theme/locale/logout
controls (`packages/client/src/app/ProfileDropdown.tsx:133-148`). Link-only — no server
closure — because chrome trees are page-independent, with no per-request endpoint for a
closure to resolve against (the same constraint `NotificationAction` has):

```php
// apps/demo/app/Admin/AdminPanel.php
->userMenuItems([
    NavItem::make('API Tokens')->url('/admin/api-tokens')->icon('key'),
])
```

### Group ordering

`navigationGroups()`'s declaration order controls the group order in the built tree — a
group not mentioned there keeps its first-seen (page-registration) order and sorts after
every declared group (`NavBuilder.php:225-229`, `assemble()`). Per-group icon/collapsible
metadata is matched by label the same way.

### Ungrouped items

A page whose `nav()` omits `group` (or a `NavItem` without `->group()`) is **not** put in a
default group. All such items form one ungrouped bucket that ships as `group: null` and
renders without a heading and without the group indent — sidebar links at the level of the
other groups' headings, inline links in the topbar, icon-only links in the collapsed rail,
and no group label in the command palette. The bucket has no `navigationGroups()` entry,
so it sorts like any undeclared group (after the declared ones, first-seen order). Use it
for a Dashboard-style entry that should not sit under a "General" label; a page that wants
a heading declares `'group' => 'General'` (and may label it via `NavGroup::make('General')`).

---

## Recipe 10 — Form-aware custom block (live client-side computation)

**What it covers:** live derived UI over *unsaved* form values — a price subtotal that
updates as the manager edits repeater rows, a character counter, a computed preview —
without a server round-trip per keystroke.

**How it works here:** `useNearestFormController()` is exported from
`@tbtop/inertia-admin`. A block registered via `registerBlock` and rendered inside a form
subtree reads the live form state through it (`data`, `isDirty`, `set`, …). Server-known
inputs for the formula (rates, tariffs) go into the block's options at page assembly.

```tsx
import { registerBlock, useNearestFormController } from "@tbtop/inertia-admin";

function Subtotal({ options }: { options: { rate: number } }) {
	const ctrl = useNearestFormController();
	const rows = Array.isArray(ctrl?.data.options) ? ctrl.data.options : [];
	const sum = rows.reduce((acc, r) => acc + Number((r as { price?: unknown }).price ?? 0), 0);
	return <output>{sum + options.rate}</output>;
}

registerBlock<"app:subtotal", { rate: number }>({
	kind: "app:subtotal",
	behavior: "leaf",
	render: Subtotal,
});
```

```php
$s->form('booking', [
    $s->repeater('options')->fields([...]),
    new Node('app:subtotal', ['rate' => $tariff->daily_rate]),
]);
```

The preview is UX-only — the authoritative total is computed server-side on submit, same
trust model as the client zod mirror. When the computation needs *server* rules over the
rows, that is the "collection deps for liveRegion" backlog item, not this recipe.

Verified by `packages/client/src/structure/formContext.test.tsx`.

---

## Recipe 11 — Action over unsaved form values (save + generate)

**The trap:** an in-page action (e.g. *Generate contract*) resolves the record from route
params — it runs against the last *saved* state. With a dirty form, the manager gets a
document built from stale data, silently.

**How it works here:** an action inside a form subtree may declare `needs: ['form']`. The
client then sends the current (unsaved) form values as `payload.form`; the server validates
them against the enclosing form's rules before the handler runs (`ActionController` mirrors
`FormSubmitController`; invalid input surfaces as inline field errors, not a toast). The
handler receives them via `$ctx->form`:

```php
$s->action('generateContract')
    ->label('Generate contract')
    ->handle(function (ActionCtx $ctx) {
        $booking = Booking::findOrFail($ctx->params['id']);
        $booking->update($ctx->form);          // persist first — the document
        ContractPdf::generate($booking);       // must match screen AND database
        return Effects::make()->notify('Contract generated');
    }, needs: ['form']);
```

Two rules make this pattern sound:

- **Persist before deriving.** Generating from fresh values without saving them would
  produce a document that disagrees with the database — worse than the stale-data trap.
  One click means "save, then generate".
- **Placement matters.** `payload.form` is only validated and delivered for actions
  *inside* the form's subtree (`ActionFormRules::enclosingFormName`). A header action
  outside the form receives nothing.

---

## Recipe 12 — Notify a user from an action handler

**What Filament calls it:** `Notification::make()->sendToDatabase($user)` inside an action.

Same here: the notification builder is plain Laravel, so call it inside any `handle()` /
`onSubmit` / preset closure and still return `Effects` for the actor's own feedback. A
modal that collects input is `EditAction` territory — it appends the inner Save/Cancel row
that actually submits the form. A hand-rolled `->modal(form)` needs its own inner action
inside the form: either a `handle()` action, or a `submit()` action whose form `onSubmit`
returns `Effects` — `->notify()->closeModal()->redirect($sameUrl)` arrives as Inertia flash
and `closeModal` closes the topmost open modal. (`->modal()` and `->handle()` on the
*same* builder are two specs and throw.)

```php
EditAction::make(
    $s,
    name: 'reassign',
    title: 'Reassign task',
    form: $s->form('reassign', [
        $s->relation('assignee_id')->label('Assignee')->searchable()
            ->query(fn (array $deps) => User::query())->required(),
    ]),
    loadUsing: fn (ActionCtx $ctx): array => ['assignee_id' => $ctx->row['assignee_id'] ?? null],
    saveUsing: function (ActionCtx $ctx): Effects {
        $task = Task::query()->whereKey($ctx->row['id'])->firstOrFail();
        $task->update(['assignee_id' => $ctx->form['assignee_id']]);

        Notification::make()->title("Task #{$task->id} assigned to you")->info()
            ->actions([NotificationAction::make('Open')->url("/admin/tasks/{$task->id}")])
            ->sendToDatabase($task->assignee);

        return Effects::make()->notify('Reassigned')->closeModal()->refreshTable();
    },
)->label('Reassign');
```

`sendToDatabase()` accepts a notifiable model, a collection or an array (it wraps
`Notification::send`). The bell in the chrome (`$s->notifications()`) picks it up on the
next poll. Notification actions are links only — no closures survive storage.

---

## Recipe 13 — Detail page: tabs beside a side column

**What Filament calls it:** a form with tabs and a sticky "summary" aside.

`$s->aside()` is a fixed-width (`w-80`) column that only makes sense as a sibling inside a
`row()`/`flex()`; it does **not** stick on scroll. Fields inside a non-active tab stay part
of the form — they still submit, and a validation error on one switches the tabs to the
failing tab automatically.

```php
public function view(S $s): Node
{
    $product = Product::findOrFail(request()->route('product'));

    return $s->form('product', [
        $s->row([
            $s->tabs([
                ['label' => 'General', 'children' => [$s->text('title'), $s->number('price_cents')]],
                ['label' => 'Media', 'children' => [$s->upload('gallery')->multiple()]],
            ]),
            $s->aside([
                $s->section(['title' => 'Summary'], [
                    $s->displayValue($product->price_cents)->money('USD'),
                    $s->displayValue($product->status)->badge([
                        'draft' => Color::Gray,
                        'published' => Color::Success,
                    ]),
                ]),
            ]),
        ]),
        $s->actionsRow([FormActions::save($s)]),
    ])->record($product->toArray())->onSubmit(fn (ActionCtx $ctx) => '/admin/products');
}
```

For a summary that must follow the form as the user types, put a `liveRegion()` in the
aside instead of static `displayValue()` blocks (scalar deps only — see
[authoring-pages.md](./authoring-pages.md#data-builders)).

---

## Not yet expressible

These Filament features do not compose today. Do NOT attempt to fake them with existing
primitives — the result will be incomplete or broken.

| Feature | Why it does not compose |
|---|---|
| ~~Relation managers with inline editing~~ | **This composes now.** `EditAction::make($s, $form, $loadUsing, $saveUsing)` is the convention — a modal form on a relation row action, loaded via the action-data endpoint and saved through `$saveUsing`. See Recipe 6. For a single cell, `Column::textInput()/toggle()/selectColumn()` + `onSave()` is lighter still (Recipe 7). |
| **Infolist field *binding* declarations** | The *auto-binding* form (`TextEntry::make('title')` that resolves `$record->title` itself) does not exist and is not planned — by design. Read-only record detail is covered instead by the display-value family (`displayValue`/`displayImage`/`displayRichtext`/`displayKeyValue`, M-96): the author passes each value directly (Recipe 2). One narrow exception: inside a **modal**, `displayValue(...)->field('name')` binds by name to the modal's query result — but it resolves from modal data, not from a page record, and is incompatible with the server-baked kinds (date/datetime/number/money). |
| **CSV export / import** | No export action kind exists. Filament uses queued jobs for large exports. This needs a new effect kind or a direct download endpoint — neither is in the closed effect set today. Listed as backlog 🟡 in the roadmap. |
| **Global search over records** | Table-level `->searchable()` and per-column `->searchable()` work within a single table; there is no cross-model record search. Note the **⌘K command palette does exist** (`PanelConfig::commandPalette()`, `Command::make()`) — it searches nav items and author-declared commands, not table rows. Record-level global search remains a roadmap gap. |
| **Multi-tenancy** | No tenant-scoping middleware or team-switching mechanism exists. Listed as backlog in the roadmap. |
| **Saved filters / filter presets** | No persistence layer for user-saved filter states. Listed as backlog 🟡. |
| **Package-side auth backend** | The *screens* compose today: the demo's `LoginPage`, `TwoFactorChallengePage`, `TwoFactorSetupPage` and `ApiTokensPage` are ordinary DSL pages using `layout(): 'center'` plus a `middleware()` override to stay public — copy them. What the **package** does not ship is the backend: the demo posts to Laravel Breeze controllers, and there is no Fortify. Standing up auth in a new consumer means bringing your own controllers (see roadmap §1.1). |
