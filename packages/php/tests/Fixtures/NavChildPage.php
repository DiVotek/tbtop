<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class NavChildPage extends Page
{
    public static function path(): string
    {
        return 'nav-child';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Child', 'order' => 1, 'parent' => NavParentPage::class];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Child page')->variant('heading')]);
    }
}
