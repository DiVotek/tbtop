<?php

namespace Tbtop\Admin\Tests;

use Tbtop\Admin\Tests\Fixtures\ColumnPostsPage;

class ColumnProjectionHttpTestCase extends TestCase
{
    public function getEnvironmentSetUp($app)
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.middleware', ['web']);
        $app['config']->set('tbtop-admin.pages', [ColumnPostsPage::class]);
    }
}
