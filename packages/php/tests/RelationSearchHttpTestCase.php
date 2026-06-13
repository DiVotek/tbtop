<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\Fixtures\Panels\RelationSearchPanel;

class RelationSearchHttpTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(new AuthUser);
        Schema::create('authors', function ($table): void {
            $table->id();
            $table->string('name');
        });
    }

    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [RelationSearchPanel::class]);
        $app['config']->set('database.connections.testing', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
        ]);
    }
}
