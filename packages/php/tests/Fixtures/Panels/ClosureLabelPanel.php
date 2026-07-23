<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Navigation\NavGroup;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\NavPage;

/** Panel whose config carries closures (lazy nav labels), mounted under /lazy. */
class ClosureLabelPanel extends TestPanel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return parent::configure($panel)
            ->id('lazy')
            ->prefix('lazy')
            ->navigationGroups([
                NavGroup::make('main')->label(fn (): string => 'Main'),
            ]);
    }

    protected function pages(): array
    {
        return [NavPage::class];
    }
}
