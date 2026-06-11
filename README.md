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
cd apps/demo
composer install && npm install
php artisan migrate --seed && php artisan storage:link
php artisan serve --port=8090   # + npm run dev (vite)
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

Registration: add the class to `config/tbtop-admin.php` → `'pages'`. Routes and
the table/data/form/action endpoints are wired automatically under the
configured `prefix` + `middleware`.

## Forms

```php
$s->form('post', [
    $s->text('title')->label('Title')->required()->rules('max:200'),
    $s->translatable('intro')->set('locales', ['en', 'uk']),
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

**Effects** (a closed set): `notify | redirect | refreshTable | resetForm | closeModal`.
Extending the set is a minor contract bump; anything non-standard goes through
`custom`.

## Uploads

Profiles live in config (`'uploads' => ['media' => [disk, dir, accept, maxSize, sizes]]`),
the endpoint is `POST {prefix}/uploads/{profile}`, with GD fit-inside variants.
The field `$s->upload('file')->set('entity', 'media')` delivers a full UploadRow
to `$ctx->form['file']` (url, mimeType, filesize, width/height, sizes).

## The contract

`contracts/structure.schema.json` is the wire grammar. Gates:
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

See `docs/roadmap.md` for the release plan and the current gap list (auth-page
layout and the relation field are the known blockers). Per-package contributor
notes live in the root `CLAUDE.md`.
