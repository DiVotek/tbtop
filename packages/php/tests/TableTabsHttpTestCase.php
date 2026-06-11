<?php

namespace Tbtop\Admin\Tests;

use Tbtop\Admin\Tests\Fixtures\TabbedPostsPage;

class TableTabsHttpTestCase extends TestCase
{
    public function getEnvironmentSetUp($app)
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.middleware', ['web']);
        $app['config']->set('tbtop-admin.pages', [TabbedPostsPage::class]);
    }
}
