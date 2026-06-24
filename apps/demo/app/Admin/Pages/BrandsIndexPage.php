<?php

namespace App\Admin\Pages;

use App\Models\Brand;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Lists brands whose name is stored via Spatie HasTranslations. Proves the
 * ->translatable() column flattens the locale map to a string on the wire
 * instead of leaking the full map (which rendered as [object Object]).
 */
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

    public function title(): string
    {
        return 'Brands';
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
