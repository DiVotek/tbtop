<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\GatedEndpointsPage;
use Tbtop\Admin\Tests\Fixtures\PostsIndexPage;

class GatedPanel extends TestPanel
{
    protected function pages(): array
    {
        return [
            GatedEndpointsPage::class,
            PostsIndexPage::class,
        ];
    }
}
