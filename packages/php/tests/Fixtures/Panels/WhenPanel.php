<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\WhenEndpointsPage;

class WhenPanel extends TestPanel
{
    protected function pages(): array
    {
        return [
            WhenEndpointsPage::class,
        ];
    }
}
