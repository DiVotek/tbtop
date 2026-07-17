<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\ActionValidationPage;

class ActionValidationPanel extends TestPanel
{
    protected function pages(): array
    {
        return [ActionValidationPage::class];
    }
}
