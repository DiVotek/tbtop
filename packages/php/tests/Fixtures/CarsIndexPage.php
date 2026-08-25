<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Builder;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Fixture for TableSortRelationTest: exercises Column::sortBy() and
 * Column::sortUsing(), plus dot-path sortable() resolving a relation column
 * via a correlated subquery (CarModel belongsTo LocationModel).
 */
class CarsIndexPage extends Page
{
    public static function path(): string
    {
        return 'cars';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('cars')
                ->columns([
                    Column::make('name')->label('Name')->sortable(),
                    Column::make('location.name')->label('Location')->sortable(),
                    Column::make('display_price')->label('Price')->sortable()->sortBy('price'),
                    Column::make('rank')->label('Rank')->sortable()
                        ->sortUsing(fn (Builder $query, string $direction) => $query
                            ->orderByRaw('CASE WHEN price IS NULL THEN 1 ELSE 0 END') // nulls last, either direction
                            ->orderBy('price', $direction)),
                ])
                ->defaultSort('id', 'asc')
                ->query(fn () => CarModel::query())
                ->toNode(),
        ]);
    }
}
