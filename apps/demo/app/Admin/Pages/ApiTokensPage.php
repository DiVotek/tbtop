<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** Reachable only from the profile dropdown (PanelConfig::userMenuItems()), not the sidebar. */
class ApiTokensPage extends Page
{
    public static function path(): string
    {
        return 'api-tokens';
    }

    public function title(): string
    {
        return 'API Tokens';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('API Tokens')->variant('heading'),
            $s->displayText('Linked from the profile dropdown via PanelConfig::userMenuItems().')
                ->variant('muted'),
        ]);
    }
}
