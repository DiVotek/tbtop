<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\ReorderPostsPage;

class ReorderPanel extends TestPanel
{
    protected function pages(): array
    {
        return [ReorderPostsPage::class];
    }
}
