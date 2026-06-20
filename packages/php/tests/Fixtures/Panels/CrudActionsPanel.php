<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\CrudActionsPage;

class CrudActionsPanel extends TestPanel
{
    protected function pages(): array
    {
        return [CrudActionsPage::class];
    }
}
