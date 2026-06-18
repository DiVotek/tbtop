<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\GatedUploadPage;
use Tbtop\Admin\Tests\Fixtures\UploadFieldPage;

class UploadFieldPanel extends TestPanel
{
    protected function pages(): array
    {
        return [UploadFieldPage::class, GatedUploadPage::class];
    }
}
