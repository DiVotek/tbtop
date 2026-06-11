<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\Fixtures\GatedEndpointsPage;
use Tbtop\Admin\Tests\Fixtures\Panels\GatedPanel;

class PageGateHttpTestCase extends TestCase
{
    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [GatedPanel::class]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        GatedEndpointsPage::$submitted = null;
        $this->actingAs(new AuthUser);

        Schema::create('items', function ($table): void {
            $table->id();
            $table->string('name');
        });
    }
}
