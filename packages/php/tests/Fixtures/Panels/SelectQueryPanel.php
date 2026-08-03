<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\SelectQueryPage;

class SelectQueryPanel extends TestPanel
{
    protected function pages(): array
    {
        return [SelectQueryPage::class];
    }
}
