<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\NavPage;

/** Panel with breadcrumbs disabled, mounted under /plain. */
class PlainPanel extends TestPanel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return parent::configure($panel)
            ->id('plain')
            ->prefix('plain')
            ->breadcrumbs(false);
    }

    protected function pages(): array
    {
        return [NavPage::class];
    }
}
