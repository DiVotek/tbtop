<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\Fixtures\Panels\CarsPanel;

class TableSortRelationHttpTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(new AuthUser);
        Schema::create('locations', function ($table): void {
            $table->id();
            $table->string('name');
            $table->softDeletes();
        });
        Schema::create('cars', function ($table): void {
            $table->id();
            $table->string('name');
            $table->foreignId('location_id')->nullable();
            $table->integer('price')->nullable();
        });
    }

    public function getEnvironmentSetUp($app)
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [CarsPanel::class]);
    }
}
