<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\CrudActionsPage;
use Tbtop\Admin\Tests\Fixtures\TestingApiPage;

class TestingApiPanel extends TestPanel
{
    protected function pages(): array
    {
        return [TestingApiPage::class, CrudActionsPage::class];
    }
}
