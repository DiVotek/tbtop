<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class NavBetaGroupPage extends Page
{
    public static function path(): string
    {
        return 'nav-beta';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Beta', 'label' => 'Beta item', 'order' => 1];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Beta')->variant('heading')]);
    }
}
