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
    $record = Post::findOrFail($this->recordId());

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

Example — a record summary page:

```php
public function view(S $s): Node
{
    $post = Post::findOrFail($this->recordId());

    return $s->stack([
        $s->displayText("Post: {$post->title}")->variant('heading'),
        $s->displayText('Published')->variant('subheading'),
        $s->displayText($post->published ? 'Yes' : 'Draft')->variant('muted'),
        $s->displayDivider(),
        $s->markdown($post->body),
    ]);
}
```

**What this is NOT:** a Filament-style Infolist that binds field definitions to model
attributes (e.g. `TextEntry::make('title')->label('Title')`). That pattern — where the
framework maps a list of field declarations to a record's values — does not exist yet.
CLAUDE.md lists "infolist" as a known gap. If you need field-driven record display, you
must interpolate values by hand into display blocks as shown above, or wait for the
infolist primitive.

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

## Not yet expressible

These Filament features do not compose today. Do NOT attempt to fake them with existing
primitives — the result will be incomplete or broken.

| Feature | Why it does not compose |
|---|---|
| **Relation managers with inline editing** | The N-table pattern (Recipe 1) handles add/delete via row actions. True inline editing (editing a relation row without a separate page) would require a modal form on a relation row action — the mechanism exists (`->modal()` on an action), but wiring a form's save back to the related record's endpoint requires per-page controller work that has no convention yet. Track via the roadmap. |
| **Infolist field declarations** | A layout that maps `TextEntry::make('title')` → reads `$record->title` dynamically does not exist. Recipe 2 covers static display blocks only. The infolist primitive is listed as a real gap in CLAUDE.md. |
| **CSV export / import** | No export action kind exists. Filament uses queued jobs for large exports. This needs a new effect kind or a direct download endpoint — neither is in the closed effect set today. Listed as backlog 🟡 in the roadmap. |
| **Global search** | The table-level `->searchable()` and per-column `.searchable()` work within a single table. A cross-page global search (the Spotlight-style overlay in Filament) needs a layout-slot design — it is listed as a known gap in the roadmap. |
| **Multi-tenancy** | No tenant-scoping middleware or team-switching mechanism exists. Listed as backlog in the roadmap. |
| **Saved filters / filter presets** | No persistence layer for user-saved filter states. Listed as backlog 🟡. |
| **Database notifications center** | The effect set has `notify` (toast only). A persistent notification inbox does not exist. |
| **Auth-page layout (Login, Register pages as DSL classes)** | The `center` layout exists and works. But there are no `LoginPage` / `RegisterPage` DSL classes in the package — auth currently lives in demo Breeze controllers. This needs a design session (see roadmap §1.1). |
