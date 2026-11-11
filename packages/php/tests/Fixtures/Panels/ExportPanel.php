<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\ExportPostsPage;

class ExportPanel extends TestPanel
{
    protected function pages(): array
    {
        return [ExportPostsPage::class];
    }
}
