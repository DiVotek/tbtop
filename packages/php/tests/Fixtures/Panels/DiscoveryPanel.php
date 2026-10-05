<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Panels\Panel;
use Tbtop\Admin\Panels\PanelConfig;

final class DiscoveryPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('discovery')
            ->pages(config('discovery.manual', []))
            ->discoverPages(config('discovery.path'), config('discovery.namespace'));
    }
}
