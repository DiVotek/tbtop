<?php

namespace Tbtop\Admin\Tests;

use Tbtop\Admin\Tests\Fixtures\PostEditPage;
use Tbtop\Admin\Tests\Fixtures\PostsIndexPage;

class HttpTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        PostEditPage::$submitted = null;
    }

    public function getEnvironmentSetUp($app)
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.middleware', ['web']);
        $app['config']->set('tbtop-admin.pages', [PostEditPage::class, PostsIndexPage::class]);
    }
}
