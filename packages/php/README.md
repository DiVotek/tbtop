# tbtop/admin

[![Latest Version on Packagist](https://img.shields.io/packagist/v/tbtop/admin.svg?style=flat-square)](https://packagist.org/packages/tbtop/admin)
[![Total Downloads](https://img.shields.io/packagist/dt/tbtop/admin.svg?style=flat-square)](https://packagist.org/packages/tbtop/admin)

The PHP half of **Tabletop**, a Laravel admin builder. You compose admin pages
with a fluent, Filament-shaped PHP DSL (the `S` builder); each page serializes
to a JSON structure and ships as Inertia props. The companion npm package
[`@tbtop/inertia-admin`](https://www.npmjs.com/package/@tbtop/inertia-admin)
is the React client that interprets that JSON and renders it — **no Livewire**.

Laravel owns everything backend: auth, validation, queues, migrations,
notifications. The DSL owns page composition. The client owns rendering. Both
packages release in lockstep from a single version, so install them together.

Full source, the reference demo app, and docs live at
[github.com/DiVotek/tbtop](https://github.com/DiVotek/tbtop).

## Requirements

| | |
|---|---|
| PHP | `^8.4` |
| Laravel | 11, 12 or 13 (`illuminate/contracts ^11.0\|\|^12.0\|\|^13.0`) |
| Inertia | `inertiajs/inertia-laravel ^3.1` |
| React | `react` and `react-dom` `^19` (peer deps of the npm package) |
| Build | Vite with **Tailwind v4** — the client ships a Tailwind source, not built CSS |

Both packages release in lockstep and must carry the **same version**.

## Installation

```bash
composer require tbtop/admin
npm install @tbtop/inertia-admin
```

Publish the config file:

```bash
php artisan vendor:publish --tag="tbtop-admin-config"
```

The package ships migrations for the media-library tables. They are registered
with Artisan automatically, so `php artisan migrate` picks them up — **run it**;
nothing migrates on install. To customize them first, publish with
`--tag="tbtop-admin-migrations"` before migrating.

Then publish the host wiring:

```bash
php artisan admin:install
```

This writes three files into your app — `resources/views/admin.blade.php`
(the root view), `resources/js/admin.tsx` (the admin entry) and
`resources/css/admin.css`. Existing files are left untouched unless you pass
`--force`. The panel renders on its **own** Inertia entry rather than your
app's main one: the bundle is large (the richtext chunk alone is ~270KB) and a
public frontend shouldn't pay for it.

Four steps remain, in files the package deliberately does not patch:

1. Add the admin entry to the Vite input list in `vite.config.ts`:

   ```js
   input: ['resources/css/app.css', 'resources/js/app.tsx', 'resources/js/admin.tsx'],
   ```

2. Point the panel at the published root view — `->rootView('admin')` in your
   `Panel::configure()`.

3. Make sure the host compiles **Tailwind v4** — the client ships a Tailwind
   source, not built CSS:

   ```bash
   npm install -D tailwindcss @tailwindcss/vite   # and add tailwindcss() to the Vite plugins
   ```

4. Build the client:

   ```bash
   npm run build
   ```

## Your first panel

A panel is one admin instance — its prefix, guard, pages and UI locales. Create
one class, point it at a directory, and every page under that directory is
discovered and routed:

```php
namespace App\Admin;

use Tbtop\Admin\Panels\Panel;
use Tbtop\Admin\Panels\PanelConfig;

class AdminPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel
            ->id('admin')                  // route-name namespace: tbtop.admin.*
            ->prefix('admin')              // routes live under /admin
            ->rootView('admin')            // the view admin:install published
            ->discoverPages(
                in: app_path('Admin/Pages'),
                for: 'App\\Admin\\Pages',
            );
    }
}
```

Register the **panel** (not each page) in `config/tbtop-admin.php`:

```php
'panels' => [\App\Admin\AdminPanel::class],
```

The guard defaults to `web` and `auth:{guard}` is applied on top of the panel's
middleware, so the panel is behind login out of the box. `->guard()`,
`->middleware()`, `->navigation()` and `->locales()` override the defaults.

Scaffold a page with `php artisan make:tbtop-page Brands` — it lands in the
discovery root and needs no registration. Pages that live outside that root, or
one that must be the panel's first route, are listed explicitly with
`->pages([...])`; discovery merges them and drops duplicates.

Discovery is cached for production: run `php artisan tbtop:cache-pages` on
deploy, and `php artisan tbtop:clear-cached-pages` after adding a page while the
cache is warm.

## A page, in PHP

```php
class BrandsIndexPage extends Page
{
    public static function path(): string
    {
        return 'brands';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Brands', 'order' => 2, 'icon' => 'star'];
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('brands')
                ->columns([
                    Column::make('name')->label('Name')->kind('text')->translatable()->searchable(),
                    Column::make('slug')->label('Slug')->kind('text'),
                    Column::make('website')->label('Website')->kind('text'),
                ])
                ->defaultSort('id', 'asc')
                ->paginate(25, [10, 25, 50])
                ->query(fn () => Brand::query())
                ->toNode(),
        ]);
    }
}
```

Drop the class under the panel's discovery root and its route, nav entry, and
table/data endpoints are wired automatically. See
[`apps/demo/app/Admin/Pages`](https://github.com/DiVotek/tbtop/tree/main/apps/demo/app/Admin/Pages)
in the monorepo for larger, real examples (forms, actions, filters, uploads).

## Architecture boundary

- **PHP DSL** (this package) composes pages: tables, forms, fields, actions,
  layout — and serializes them to StructureNode JSON.
- **Laravel** owns the backend: validation rules, queues, migrations, auth,
  notifications. The DSL never reinvents these — it wires into them.
- **React client** (`@tbtop/inertia-admin`) owns rendering: it interprets the
  JSON and renders the 26 field kinds, tables, forms, and layout blocks.

A JSON Schema (`packages/contracts/structure.schema.json` in the monorepo) is
the wire contract both sides are tested against, so the DSL and the client
never silently drift apart.

## Testing

```bash
composer test
```

## Contributing

Please see [CONTRIBUTING.md](https://github.com/DiVotek/tbtop/blob/main/CONTRIBUTING.md)
in the monorepo.

## Security Vulnerabilities

Please see [SECURITY.md](https://github.com/DiVotek/tbtop/blob/main/SECURITY.md)
for how to report a vulnerability.

## Credits

- [Divotek](https://github.com/DiVotek)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
