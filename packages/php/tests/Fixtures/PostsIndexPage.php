<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class PostsIndexPage extends Page
{
    public static function path(): string
    {
        return 'posts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('posts')
                ->columns(['title' => 'Title', 'views' => 'Views'])
                ->searchable(['title'])
                ->defaultSort('views', 'desc')
                ->perPage(2)
                ->query(fn () => DB::table('posts'))
                ->toNode(),
            $s->chart('byStatus', 'donut', ['nameKey' => 'status'])
                ->query(fn () => DB::table('posts')
                    ->selectRaw("case when published = 1 then 'Published' else 'Draft' end as status, count(*) as total")
                    ->groupBy('published')
                    ->orderBy('total')
                    ->get())
                ->toNode(),
        ]);
    }
}
