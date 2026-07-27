<?php

namespace Tbtop\Admin\Tests;

use Tbtop\Admin\Tests\Fixtures\Panels\ClosureLabelPanel;

class RouteCacheSerializationTestCase extends TestCase
{
    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [ClosureLabelPanel::class]);
    }
}
