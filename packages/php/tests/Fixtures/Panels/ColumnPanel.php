<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\ColumnPostsPage;

class ColumnPanel extends TestPanel
{
    protected function pages(): array
    {
        return [ColumnPostsPage::class];
    }
}
