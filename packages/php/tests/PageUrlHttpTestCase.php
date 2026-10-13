<?php

namespace Tbtop\Admin\Tests;

use Tbtop\Admin\Tests\Fixtures\Panels\AdminPanel;
use Tbtop\Admin\Tests\Fixtures\Panels\PlainPanel;

/** NavPage sits in both panels; PostEditPage only in admin. */
class PageUrlHttpTestCase extends TestCase
{
    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [AdminPanel::class, PlainPanel::class]);
    }
}
