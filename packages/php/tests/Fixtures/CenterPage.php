<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class CenterPage extends Page
{
    public static function path(): string
    {
        return 'center';
    }

    public function layout(): string
    {
        return 'center';
    }

    public function subtitle(): ?string
    {
        return 'Centered subtitle';
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Centered content')]);
    }
}
