<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\RelationSearchPage;

class RelationSearchPanel extends TestPanel
{
    protected function pages(): array
    {
        return [RelationSearchPage::class];
    }
}
