<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Tbtop\Admin\Tests\Fixtures\Panels\AdminPanel;
use Tbtop\Admin\Tests\Fixtures\Panels\PlainPanel;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;
use Tbtop\Admin\Tests\Fixtures\TabbedFormPage;

class HttpTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        PostEditPage::$submitted = null;
        TabbedFormPage::$submitted = null;
        $this->actingAs(new AuthUser);
    }

    public function getEnvironmentSetUp($app)
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [
            AdminPanel::class,
            PlainPanel::class,
        ]);
    }
}
