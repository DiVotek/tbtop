<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class NavCyclePageB extends Page
{
    public static function path(): string
    {
        return 'nav-cycle-b';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Cycle B', 'order' => 2, 'parent' => NavCyclePageA::class];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Cycle B')->variant('heading')]);
    }
}
