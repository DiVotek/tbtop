<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\ChartParamsPage;

class ChartPanel extends TestPanel
{
    protected function pages(): array
    {
        return [ChartParamsPage::class];
    }
}
