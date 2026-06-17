<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Tests\Fixtures\Panels\MiddlewareOverridePanel;
use Tbtop\Admin\Tests\Fixtures\PublicLoginPage;

class MiddlewareOverrideHttpTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        PublicLoginPage::$submitted = null;
        // Group-level name prefixes land after routes join the collection;
        // outside an HTTP request the lookup table must be refreshed by hand.
        Route::getRoutes()->refreshNameLookups();
    }

    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [MiddlewareOverridePanel::class]);
    }
}
