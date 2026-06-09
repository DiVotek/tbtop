<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class NavPage extends Page
{
    public static function path(): string
    {
        return 'nav-demo';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Nav Demo', 'order' => 2];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->heading('Nav demo')]);
    }
}
