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

## Installation

```bash
composer require tbtop/admin
npm install @tbtop/inertia-admin
```

Publish the config file:

```bash
php artisan vendor:publish --tag="tbtop-admin-config"
```

The package ships its own migrations (media library tables) and runs them
automatically — no separate `migrate` step is required. If you need to
customize them first, publish with `--tag="tbtop-admin-migrations"` before
running `php artisan migrate`.

Register your admin panel and pages in `config/tbtop-admin.php` (see the
`panels` key), then wire up the React entry point using
`@tbtop/inertia-admin` on the client side.

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

Register the class in `config/tbtop-admin.php`, and its route, nav entry, and
table/data endpoints are wired automatically. See
[`apps/demo/app/Admin/Pages`](https://github.com/DiVotek/tbtop/tree/main/apps/demo/app/Admin/Pages)
in the monorepo for larger, real examples (forms, actions, filters, uploads).

## Architecture boundary

- **PHP DSL** (this package) composes pages: tables, forms, fields, actions,
  layout — and serializes them to StructureNode JSON.
- **Laravel** owns the backend: validation rules, queues, migrations, auth,
  notifications. The DSL never reinvents these — it wires into them.
- **React client** (`@tbtop/inertia-admin`) owns rendering: it interprets the
  JSON and renders the ~20 field kinds, tables, forms, and layout blocks.

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
