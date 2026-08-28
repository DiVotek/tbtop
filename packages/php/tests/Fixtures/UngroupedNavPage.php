<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class UngroupedNavPage extends Page
{
    public static function path(): string
    {
        return 'ungrouped';
    }

    public static function nav(): ?array
    {
        return ['label' => 'Ungrouped item', 'order' => 1];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Ungrouped')->variant('heading')]);
    }
}
