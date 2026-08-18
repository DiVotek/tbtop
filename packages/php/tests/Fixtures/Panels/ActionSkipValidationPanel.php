<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\ActionSkipValidationPage;
use Tbtop\Admin\Tests\Fixtures\UnserializableActionPage;

class ActionSkipValidationPanel extends TestPanel
{
    protected function pages(): array
    {
        return [ActionSkipValidationPage::class, UnserializableActionPage::class];
    }
}
