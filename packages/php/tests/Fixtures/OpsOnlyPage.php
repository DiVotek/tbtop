<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class OpsOnlyPage extends Page
{
    public static function path(): string
    {
        return 'ops-only';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Ops', 'label' => 'Ops Only', 'order' => 1];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Ops only')->variant('heading')]);
    }
}
