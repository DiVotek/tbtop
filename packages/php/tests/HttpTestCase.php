<?php

namespace Tbtop\Admin\Tests;

use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;
use Tbtop\Admin\Tests\Fixtures\PostsIndexPage;
use Tbtop\Admin\Tests\Fixtures\TranslatablePostsPage;

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
        $app['config']->set('tbtop-admin.pages', [
            PostEditPage::class,
            PostsIndexPage::class,
            TranslatablePostsPage::class,
            NavPage::class,
        ]);
        $app['config']->set('tbtop-admin.locales', ['en', 'uk']);
        $app['config']->set('tbtop-admin.default_locale', 'en');
    }
}
