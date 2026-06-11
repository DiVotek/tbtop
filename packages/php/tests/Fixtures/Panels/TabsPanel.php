<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\TabbedPostsPage;

/** Panel exposing the table-tabs fixture page. */
class TabsPanel extends TestPanel
{
    protected function pages(): array
    {
        return [TabbedPostsPage::class];
    }
}
