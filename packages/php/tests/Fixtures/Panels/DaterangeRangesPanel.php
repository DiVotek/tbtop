<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\DaterangeRangesPage;

class DaterangeRangesPanel extends TestPanel
{
    protected function pages(): array
    {
        return [DaterangeRangesPage::class];
    }
}
