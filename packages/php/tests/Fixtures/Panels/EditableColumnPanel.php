<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\EditableColumnsPage;

class EditableColumnPanel extends TestPanel
{
    protected function pages(): array
    {
        return [EditableColumnsPage::class];
    }
}
