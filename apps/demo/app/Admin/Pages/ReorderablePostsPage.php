<?php

namespace App\Admin\Pages;

use App\Models\Post;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Dedicated reorder demo. Kept separate from PostsIndexPage because that page
 * pins defaultSort('created_at','desc'), which would win over the reorder
 * column and break persisted order. No rowClick here — the row is a drag target.
 */
class ReorderablePostsPage extends Page
{
    public static function path(): string
    {
        return 'reorderable-posts';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Reorderable posts', 'order' => 2];
    }

    public function title(): string
    {
        return 'Reorderable posts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('posts')
                ->columns([
                    Column::make('title')
                        ->label('Title')
                        ->kind('text'),
                    Column::make('views')
                        ->label('Views')
                        ->number()
                        ->sortable()
                        ->align('right'),
                ])
                ->reorderable('sort_order')
                ->paginate(50, [25, 50, 100])
                ->query(fn () => Post::query())
                ->toNode(),
        ]);
    }
}
