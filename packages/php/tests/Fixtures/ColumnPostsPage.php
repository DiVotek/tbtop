<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Fixture for ColumnProjectionTest: exercises Column DSL with sortable
 * whitelist, per-column searchable, and paginate().
 */
class ColumnPostsPage extends Page
{
    public static function path(): string
    {
        return 'cposts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('cposts')
                ->columns([
                    Column::make('title')->label('Title')->searchable()->individuallySearchable(),
                    Column::make('status')->label('Status')->searchable(),  // NOT sortable, but searchable
                    Column::make('price')->label('Price')->sortable(),
                    Column::make('published_at')->label('Published')->date('Y-m-d'),
                    Column::make('active')->label('Active'),
                ])
                ->paginate(25, [10, 25, 50, 100])
                ->defaultSort('id', 'asc')
                ->query(fn () => DB::table('cposts'))
                ->toNode(),
        ]);
    }
}
