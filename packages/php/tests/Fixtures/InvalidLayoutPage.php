<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class InvalidLayoutPage extends Page
{
    public static function path(): string
    {
        return 'invalid-layout';
    }

    public function layout(): string
    {
        return 'fullscreen';
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Invalid layout page')]);
    }
}
