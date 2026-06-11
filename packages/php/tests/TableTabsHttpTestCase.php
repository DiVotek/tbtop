<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Tbtop\Admin\Tests\Fixtures\Panels\TabsPanel;

class TableTabsHttpTestCase extends TestCase
{
    public function getEnvironmentSetUp($app)
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [TabsPanel::class]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(new AuthUser);
    }
}
