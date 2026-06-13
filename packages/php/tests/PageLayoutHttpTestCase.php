<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Tbtop\Admin\Tests\Fixtures\Panels\LayoutPanel;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;

class PageLayoutHttpTestCase extends TestCase
{
    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [LayoutPanel::class]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        PostEditPage::$submitted = null;
        $this->actingAs(new AuthUser);
    }
}
