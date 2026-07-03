<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class NavCyclePageA extends Page
{
    public static function path(): string
    {
        return 'nav-cycle-a';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Cycle A', 'order' => 1, 'parent' => NavCyclePageB::class];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Cycle A')->variant('heading')]);
    }
}
