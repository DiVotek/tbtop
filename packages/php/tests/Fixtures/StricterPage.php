<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Fixture for MiddlewareOverrideHttpTest: a page that spreads the panel auth
 * stack and adds a stricter gate via middleware (not the can() trait), so it
 * keeps auth:web and additionally requires the 'super-admin' ability.
 */
class StricterPage extends Page
{
    public static function path(): string
    {
        return 'stricter';
    }

    public static function middleware(PanelConfig $panel): ?array
    {
        return [...$panel->authStack(), 'can:super-admin'];
    }

    public function view(S $s): Node
    {
        return $s->stack([$s->displayText('Stricter')->variant('heading')]);
    }
}
