<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\Fixtures\Panels\WhenPanel;
use Tbtop\Admin\Tests\Fixtures\WhenEndpointsPage;

class WhenEndpointHttpTestCase extends TestCase
{
    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [WhenPanel::class]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        WhenEndpointsPage::$allow = false;
        $this->actingAs(new AuthUser);

        Schema::create('when_items', function ($table): void {
            $table->id();
            $table->string('name');
            $table->integer('position')->default(0);
        });
        Schema::create('authors', function ($table): void {
            $table->id();
            $table->string('name');
        });
    }
}
