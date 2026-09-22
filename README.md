# Tabletop — Laravel + Inertia admin builder

An admin builder: pages are authored in a PHP DSL, serialized to a JSON
structure in Inertia props, and rendered by a React interpreter. Filament's
authoring model, without Livewire.

## Layout

| Package | What it is |
|---|---|
| `packages/php` | composer `tbtop/admin` — DSL, controllers, Effects, nav, uploads |
| `packages/client` | npm `@tbtop/inertia-admin` — render layer + Inertia integration |
| `packages/contracts` | JSON Schema grammar + kitchen-sink fixture (the contract shared by both sides) |
| `apps/demo` | Laravel 12 + Inertia v3 reference app (acceptance) |

## Run the demo

```bash
# the demo aliases @tbtop/inertia-admin to packages/client/src, whose Tailwind
# source pulls its own deps — install them first
(cd packages/client && bun install)

cd apps/demo
composer install && npm install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed && php artisan storage:link
npm run dev                     # keep running: without a Vite dev server or a
                                # prior `npm run build`, admin pages 500 on the
                                # missing manifest
php artisan serve --port=8090   # in a second terminal
# http://127.0.0.1:8090/admin/posts — admin@admin.com / password
```

## A page in 30 seconds

```php
class PostsIndexPage extends Page
{
    public static function path(): string { return 'posts'; }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Posts', 'order' => 1];
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('posts')
                ->columns(['title' => 'Title', 'views' => 'Views'])
                ->searchable(['title'])
                ->defaultSort('created_at', 'desc')
                ->query(fn () => Post::query())
                ->rowActions([
                    $s->action('edit')->label('Edit')
                        ->visit('/admin/posts/{row.id}/edit'),   // row template
                    $s->action('delete')->label('Delete')->color('danger')
                        ->confirm('Delete this post?')
                        ->handle(function (ActionCtx $ctx): Effects {
                            Post::whereKey($ctx->row['id'])->delete();
                            return Effects::make()->notify('Deleted')->refreshTable();
                        }, needs: ['row']),
                ])
                ->toNode(),
        ]);
    }
}
```

Registration: nothing per page. A panel (listed once in
`config/tbtop-admin.php` → `'panels'`) declares a discovery root in its
`configure()` —
`->discoverPages(in: app_path('Admin/Pages'), for: 'App\\Admin\\Pages')` — and
every page class under it is found and routed automatically. Adding a screen is
`php artisan make:tbtop-page Posts` and nothing else. Pages outside that root
(package-owned ones such as the media library) and any page that must come
first are listed explicitly with `->pages([...])`; discovery merges them and
drops duplicates. Routes and the table/data/form/action endpoints are wired
under the panel's `prefix` + `middleware`.

Discovery results are cached: run `php artisan tbtop:cache-pages` in
deployment, and `php artisan tbtop:clear-cached-pages` after adding a page
locally if the cache is warm.

## Forms

```php
$s->form('post', [
    $s->text('title')->label('Title')->required()->rules('max:200'),
    $s->text('intro')->label('Intro')->translatable(),   // per content locale
    $s->repeater('sections')->rules('array|max:10')->set('fields', [
        $s->text('heading')->required(),
    ]),
    $s->actionsRow([
        $s->action('save')->label('Save')->keybinding('mod+s')->submit(),
    ]),
])
->record($post->toArray())                       // initial data → props
->onSubmit(function (ActionCtx $ctx): Effects {  // $ctx->form = validated
    $post->update($ctx->form);
    return Effects::make()->notify('Saved');
});
```

- Laravel owns validation: rules are collected from the fields (repeater →
  `parent.*.child`), `validate()` → 422 → errors land on the fields. Regex rules
  must use the array form.
- The declarative subset of rules ships to the client as `constraints` for
  on-blur validation.
- Submit goes through Inertia `router.post` (errors bag, history); success
  effects arrive via flash.
- A field with no rules gets a baseline `nullable` (otherwise Laravel drops it
  from the validated payload).

## Actions — five kinds

| Spec | What it does |
|---|---|
| `->visit(url)` | Inertia visit; supports `{row.id}` templates |
| `->submit()` | submit the nearest (or a named) form |
| `->handle(fn, needs: [...])` | POST to a server closure; payload by `needs`: form/row/selection |
| `->modal(title, $node)` | client modal with a StructureNode body |
| `->custom('name', params)` | client registry via `defineCustomAction()` |

`->confirm(title)` wraps a server action in a confirm modal. Server closures
resolve by name per-request — they never travel over the wire.

**Effects** (a closed set): `notify | redirect | refreshTable | resetForm |
closeModal | haltModal | copyToClipboard | setFormData`.
Extending the set is a minor contract bump; anything non-standard goes through
`custom`.

## Uploads

An upload field carries its own storage config — there is no global profile
registry, and the client cannot override any of it:

```php
$s->upload('doc')->label('Document')
    ->disk('public')->directory('docs')->visibility('public')
    ->accept('image/*')->maxSize(5 * 1024 * 1024)
    ->convertTo('webp')->quality(80),          // optional GD conversion
$s->upload('gallery')->multiple()->maxFiles(8)->reorderable(),
```

The endpoint is page-scoped — `POST {page-path}/uploads/{field}` — and inherits
the page's gate. It answers `{data: {path, url}}`, and **the form value is the
path string** (a list of them when `multiple()`), so `$ctx->form['doc']` is
what you persist. A `private` field's `url` comes back signed and short-lived,
so the preview renders without exposing the file publicly. `saveUsing()`
replaces the storage step when you need your own.

The media library is a separate feature with its own manager, tables and
config (`'media'` in `config/tbtop-admin.php`) — use `$s->media()` for it.

## The contract

`packages/contracts/structure.schema.json` is the wire grammar. Gates:
- PHP: the kitchen-sink page validates against the schema + a snapshot
  (`UPDATE_FIXTURES=1 vendor/bin/pest` to regenerate);
- client: the same fixture passes the zod mirror and a render smoke test.

A new block = update the schema + the zod mirror + the fixture in one PR.

## Quality gates

```bash
cd packages/php && vendor/bin/pest && vendor/bin/phpstan analyse && vendor/bin/pint --test
cd packages/client && bun test && bunx tsc --noEmit
cd apps/demo && php artisan test
```

phpstan runs at level 5 (the skeleton default; raise it in `phpstan.neon.dist`).

## Status

See `docs/backlog.md` for the current gap list (a package-side auth backend is
the known blocker). Per-package contributor notes live in the root `CLAUDE.md`.
