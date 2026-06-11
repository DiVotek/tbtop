<?php

namespace Tbtop\Admin\Tests;

use Tbtop\Admin\Tests\Fixtures\CenterPage;
use Tbtop\Admin\Tests\Fixtures\InvalidLayoutPage;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;

class PageLayoutHttpTestCase extends TestCase
{
    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.middleware', ['web']);
        $app['config']->set('tbtop-admin.pages', [
            PostEditPage::class,
            CenterPage::class,
            InvalidLayoutPage::class,
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        PostEditPage::$submitted = null;
    }
}
