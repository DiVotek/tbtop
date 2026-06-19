<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\ActionDataPage;

class ActionDataPanel extends TestPanel
{
    protected function pages(): array
    {
        return [ActionDataPage::class];
    }
}
