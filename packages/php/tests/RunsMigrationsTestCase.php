<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Deliberately does NOT loadMigrationsFrom() — proves the provider
 * itself loads package migrations (runsMigrations) without publish.
 */
class RunsMigrationsTestCase extends TestCase
{
    use RefreshDatabase;

    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('database.default', 'testing');
        $app['config']->set('database.connections.testing', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
        ]);
    }
}
