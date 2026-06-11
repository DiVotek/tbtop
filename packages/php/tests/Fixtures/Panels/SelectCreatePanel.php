<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\SelectCreatablePage;

class SelectCreatePanel extends TestPanel
{
    protected function pages(): array
    {
        return [SelectCreatablePage::class];
    }
}
