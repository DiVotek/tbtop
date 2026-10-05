<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class NavSectionedChildPage extends Page
{
    public static function path(): string
    {
        return 'nav-sectioned-child';
    }

    public static function nav(): ?array
    {
        return [
            'group' => 'Content',
            'label' => 'Sectioned child',
            'section' => 'reports',
            'order' => 2,
            'parent' => GatedNavParentPage::class,
        ];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Child of gated parent')->variant('heading')]);
    }
}
