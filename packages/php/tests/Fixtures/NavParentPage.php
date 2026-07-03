<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class NavParentPage extends Page
{
    public static function path(): string
    {
        return 'nav-parent';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Parent', 'order' => 1];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Parent page')->variant('heading')]);
    }
}
