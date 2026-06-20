<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\SoftDeletesPage;

class SoftDeletesPanel extends TestPanel
{
    protected function pages(): array
    {
        return [SoftDeletesPage::class];
    }
}
