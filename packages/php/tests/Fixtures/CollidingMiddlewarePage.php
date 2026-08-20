<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\PanelConfig;

class CollidingMiddlewarePage extends Page
{
    public static function path(): string
    {
        return 'colliding-middleware';
    }

    public function view(S $s): Node
    {
        return $s->text('Collision override');
    }

    public static function middleware(PanelConfig $panel): ?array
    {
        return ['web|auth:web'];
    }
}
