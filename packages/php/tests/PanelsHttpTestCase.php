<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Tests\Fixtures\Panels\AdminPanel;
use Tbtop\Admin\Tests\Fixtures\Panels\OpsPanel;

class PanelsHttpTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Group-level name prefixes land after routes join the collection;
        // outside an HTTP request the lookup table must be refreshed by hand.
        Route::getRoutes()->refreshNameLookups();
    }

    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('auth.guards.staff', ['driver' => 'session', 'provider' => 'users']);
        $app['config']->set('tbtop-admin.panels', [
            AdminPanel::class,
            OpsPanel::class,
        ]);
    }
}
