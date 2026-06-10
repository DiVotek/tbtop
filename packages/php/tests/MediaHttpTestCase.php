<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;

class MediaHttpTestCase extends TestCase
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
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.middleware', ['web']);
        $app['config']->set('tbtop-admin.pages', []);
        $app['config']->set('tbtop-admin.media', [
            'disk' => 'public',
            'accept' => ['image/*'],
            'max_size' => 10240,
            'profiles' => ['thumb' => [128, 128]],
            'url_import' => ['timeout' => 5, 'max_size' => 1024],
        ]);
    }

    protected function defineDatabaseMigrations(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }
}
