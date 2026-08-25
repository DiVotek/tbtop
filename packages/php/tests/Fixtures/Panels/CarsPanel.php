<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\CarsIndexPage;

class CarsPanel extends TestPanel
{
    protected function pages(): array
    {
        return [CarsIndexPage::class];
    }
}
