<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Tbtop\Admin\Tests\Fixtures\HeaderActionsPage;
use Tbtop\Admin\Tests\Fixtures\Panels\HeaderActionsPanel;

class HeaderActionsHttpTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        HeaderActionsPage::$refreshed = false;
        $this->actingAs(new AuthUser);
    }

    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [HeaderActionsPanel::class]);
    }
}
