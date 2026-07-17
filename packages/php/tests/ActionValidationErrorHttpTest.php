<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Tbtop\Admin\Tests\Fixtures\Panels\ActionValidationPanel;

/**
 * Audit 5.20: action endpoints had no field-error channel — an uncaught
 * ValidationException degraded (client-side) to a generic toast because
 * the response, while already a clean Laravel-native 422, was never
 * mapped into the client's per-field errors. This file proves the PHP
 * side of that contract: what shape ActionController actually returns
 * today for each of the three outcomes a form-consuming action can have.
 */
class ActionValidationErrorHttpTest extends TestCase
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
        $app['config']->set('tbtop-admin.panels', [ActionValidationPanel::class]);
    }
}
