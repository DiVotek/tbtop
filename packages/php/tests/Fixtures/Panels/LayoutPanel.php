<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\CenterPage;
use Tbtop\Admin\Tests\Fixtures\InvalidLayoutPage;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;

/** Panel exposing the page-layout fixtures. */
class LayoutPanel extends TestPanel
{
    protected function pages(): array
    {
        return [
            PostEditPage::class,
            CenterPage::class,
            InvalidLayoutPage::class,
        ];
    }
}
