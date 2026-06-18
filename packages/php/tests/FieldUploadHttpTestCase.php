<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Tbtop\Admin\Tests\Fixtures\Panels\UploadFieldPanel;

class FieldUploadHttpTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(new AuthUser);
    }

    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [UploadFieldPanel::class]);
    }
}
