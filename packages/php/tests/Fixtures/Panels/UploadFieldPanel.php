<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\GatedUploadPage;
use Tbtop\Admin\Tests\Fixtures\GatedUploadRenderPage;
use Tbtop\Admin\Tests\Fixtures\ParametrisedUploadPage;
use Tbtop\Admin\Tests\Fixtures\UploadFieldPage;
use Tbtop\Admin\Tests\Fixtures\UploadRenderPage;

class UploadFieldPanel extends TestPanel
{
    protected function pages(): array
    {
        return [
            UploadFieldPage::class,
            GatedUploadPage::class,
            UploadRenderPage::class,
            GatedUploadRenderPage::class,
            ParametrisedUploadPage::class,
        ];
    }
}
