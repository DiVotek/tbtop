<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class GatedNavParentPage extends Page
{
    public static function path(): string
    {
        return 'gated-nav-parent';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Gated Parent', 'order' => 1];
    }

    public static function can(): ?string
    {
        return 'view-gated-parent';
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Gated parent page')->variant('heading')]);
    }
}
