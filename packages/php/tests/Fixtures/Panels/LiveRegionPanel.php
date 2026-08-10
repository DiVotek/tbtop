<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\LiveRegionPage;

class LiveRegionPanel extends TestPanel
{
    protected function pages(): array
    {
        return [LiveRegionPage::class];
    }
}
