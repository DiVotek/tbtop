<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\HeaderActionsPage;

class HeaderActionsPanel extends TestPanel
{
    protected function pages(): array
    {
        return [HeaderActionsPage::class];
    }
}
