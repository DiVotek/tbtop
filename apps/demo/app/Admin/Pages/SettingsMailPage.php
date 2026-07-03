<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** Nested under Settings via nav()['parent'] — proof of the nested-nav mechanism. */
class SettingsMailPage extends Page
{
    public static function path(): string
    {
        return 'settings/mail';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Mail', 'order' => 2, 'parent' => SettingsPage::class];
    }

    public function title(): string
    {
        return 'Mail settings';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Mail settings')->variant('heading'),
            $s->displayText('Nested under Site settings — see nav()[\'parent\'].')->variant('muted'),
        ]);
    }
}
