<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** Nested under Settings via nav()['parent'] — proof of the nested-nav mechanism. */
class SettingsGeneralPage extends Page
{
    public static function path(): string
    {
        return 'settings/general';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'General', 'order' => 1, 'parent' => SettingsPage::class];
    }

    public function title(): string
    {
        return 'General settings';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('General settings')->variant('heading'),
            $s->displayText('Nested under Site settings — see nav()[\'parent\'].')->variant('muted'),
        ]);
    }
}
