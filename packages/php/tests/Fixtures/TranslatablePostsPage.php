<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Dsl\LayoutBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class TranslatablePostsPage extends Page
{
    public static function path(): string
    {
        return 'tposts';
    }

    public function view(S $s): Node|LayoutBuilder
    {
        return $s->stack([
            $s->table('tposts')
                ->columns([
                    ['name' => 'title', 'label' => 'Title', 'kind' => 'text', 'translatable' => true],
                    ['name' => 'views', 'label' => 'Views', 'kind' => 'text'],
                ])
                ->query(fn () => DB::table('tposts'))
                ->toNode(),
        ]);
    }
}
