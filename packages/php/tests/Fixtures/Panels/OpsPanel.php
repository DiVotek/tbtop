<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Panels\Panel;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\Chromes\HeaderActionChrome;
use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\OpsOnlyPage;

/** Second panel under /ops, protected by the 'staff' guard. */
class OpsPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel
            ->id('ops')
            ->prefix('ops')
            ->guard('staff')
            ->middleware(['web'])
            ->pages([NavPage::class, OpsOnlyPage::class])
            ->locales(['fr', 'en'])
            ->defaultLocale('fr')
            ->navigation('topbar')
            ->chrome(HeaderActionChrome::class);
    }
}
