<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class NavAlphaGroupPage extends Page
{
    public static function path(): string
    {
        return 'nav-alpha';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Alpha', 'label' => 'Alpha item', 'order' => 1];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Alpha')->variant('heading')]);
    }
}
