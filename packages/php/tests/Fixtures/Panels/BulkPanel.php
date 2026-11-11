<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\BulkPostsPage;

class BulkPanel extends TestPanel
{
    protected function pages(): array
    {
        return [BulkPostsPage::class];
    }
}
