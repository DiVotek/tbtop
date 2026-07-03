<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class NavOrphanChildPage extends Page
{
    public static function path(): string
    {
        return 'nav-orphan-child';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Orphan Child', 'order' => 1, 'parent' => PostEditPage::class];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Orphan child')->variant('heading')]);
    }
}
