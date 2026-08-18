<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\ActionSkipValidationPage;

class ActionSkipValidationPanel extends TestPanel
{
    protected function pages(): array
    {
        return [ActionSkipValidationPage::class];
    }
}
