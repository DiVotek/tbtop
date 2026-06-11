<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\LayoutBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class GatedNavPage extends Page
{
    public static function path(): string
    {
        return 'gated-nav';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Gated Nav', 'order' => 5];
    }

    public static function can(): ?string
    {
        return 'view-gated';
    }

    public function view(S $s): Node|LayoutBuilder
    {
        return $s->stack([$s->displayText('Gated page')->variant('heading')]);
    }
}
