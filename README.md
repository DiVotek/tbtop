# Tabletop on Laravel + Inertia — прототип

Admin-билдер: страницы авторятся PHP-DSL, сериализуются как JSON-структура в
Inertia-props, рендерятся React-интерпретатором. Filament-модель без Livewire.

## Состав

| Пакет | Что это |
|---|---|
| `packages/php` | composer `tbtop/admin` — DSL, контроллеры, Effects, nav, uploads |
| `packages/client` | npm `@tbtop/inertia-admin` — render-слой + Inertia-интеграция |
| `packages/contracts` | JSON Schema грамматики + kitchen-sink фикстура (контракт двух сторон) |
| `apps/demo` | Laravel 12 + Inertia v3, копия tabletop-демо (acceptance) |

## Запуск демо

```bash
cd apps/demo
composer install && npm install
php artisan migrate --seed && php artisan storage:link
php artisan serve --port=8090   # + npm run dev (vite)
# http://127.0.0.1:8090/admin/posts — admin@admin.com / password
```

## Страница за 30 секунд

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
                        ->visit('/admin/posts/{row.id}/edit'),   // row-шаблон
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

Регистрация: класс в `config/tbtop-admin.php` → `'pages'`. Роуты, endpoints
таблиц/данных/форм/actions поднимаются автоматически под `prefix` + `middleware`.

## Формы

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

- Валидацией владеет Laravel: rules собираются с полей (repeater → `parent.*.child`),
  `validate()` → 422 → ошибки в полях. Regex-rules — только array-формой.
- Декларативное подмножество rules едет на клиент как `constraints` → blur-валидация.
- Submit — Inertia `router.post` (errors bag, history); success-эффекты — через flash.
- Поле без rules получает baseline `nullable` (иначе Laravel выкинет его из validated).

## Actions — пять видов

| Spec | Что делает |
|---|---|
| `->visit(url)` | Inertia-переход; поддерживает `{row.id}`-шаблоны |
| `->submit()` | submit ближайшей (или именованной) формы |
| `->handle(fn, needs: [...])` | POST на server-closure; payload по `needs`: form/row/selection |
| `->modal(title, $node)` | клиентский модал со StructureNode-телом |
| `->custom('name', params)` | клиентский реестр `defineCustomAction()` |

`->confirm(title)` оборачивает server-action в confirm-модал. Server-closures
резолвятся по имени per-request — на провод никогда не едут.

**Effects** (закрытый словарь): `notify | redirect | refreshTable | resetForm | closeModal`.
Расширение = минорный bump контракта; нестандартное — через `custom`.

## Uploads

Профили в конфиге (`'uploads' => ['media' => [disk, dir, accept, maxSize, sizes]]`),
endpoint `POST {prefix}/uploads/{profile}`, GD-варианты fit-inside. Поле:
`$s->upload('file')->set('entity', 'media')` — в `$ctx->form['file']` приходит
полный UploadRow (url, mimeType, filesize, width/height, sizes).

## Контракт

`contracts/structure.schema.json` — грамматика провода. Гейты:
- PHP: kitchen-sink страница валидируется против схемы + snapshot
  (`UPDATE_FIXTURES=1 vendor/bin/pest` для регенерации);
- клиент: та же фикстура проходит zod-зеркало и рендер-smoke.

Новый блок = обновить схему + zod-зеркало + фикстуру в одном PR.

## Гейты качества

```bash
cd packages/php && vendor/bin/pest && vendor/bin/phpstan analyse && vendor/bin/pint --test
cd packages/client && bun test && bunx tsc --noEmit
cd apps/demo && php artisan test
```

phpstan — level 5 (skeleton-дефолт, поднимается в `phpstan.neon.dist`).

## Известные гэпы

Lexical rich-text (пока textarea), async-опции relation-полей (статический select),
UI-локализация админки (content-translatable работает), параметры chart/data-endpoints,
per-locale валидация translatable. План и решения: `docs/migration/inertia-pivot.md`.
