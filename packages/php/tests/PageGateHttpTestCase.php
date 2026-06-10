<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\Fixtures\GatedEndpointsPage;
use Tbtop\Admin\Tests\Fixtures\PostsIndexPage;

class PageGateHttpTestCase extends TestCase
{
    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.middleware', ['web']);
        $app['config']->set('tbtop-admin.pages', [
            GatedEndpointsPage::class,
            PostsIndexPage::class,
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        GatedEndpointsPage::$submitted = null;

        Schema::create('items', function ($table): void {
            $table->id();
            $table->string('name');
        });
    }
}
