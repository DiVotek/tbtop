<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Pages\Page;

class TabbedPostsPage extends Page
{
    public static function path(): string
    {
        return 'tab-posts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('posts')
                ->columns(['title' => 'Title', 'views' => 'Views'])
                ->searchable(['title'])
                ->defaultSort('title', 'asc')
                ->tabs([
                    Tab::make('published')->query(fn ($q) => $q->where('published', true))->count(),
                    Tab::make('draft')->label('Drafts')->query(fn ($q) => $q->where('published', false))->count(),
                    Tab::make('all'),
                ])
                ->query(fn () => DB::table('posts'))
                ->toNode(),
        ]);
    }
}
