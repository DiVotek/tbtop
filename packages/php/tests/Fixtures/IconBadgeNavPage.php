<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class IconBadgeNavPage extends Page
{
    public static function path(): string
    {
        return 'iconic';
    }

    public static function nav(): ?array
    {
        return [
            'group' => 'Content',
            'label' => 'Iconic',
            'order' => 1,
            'icon' => 'star',
            'badge' => 3,
            'badgeColor' => Color::Danger,
        ];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Iconic page')->variant('heading')]);
    }
}
