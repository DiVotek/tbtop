<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\Fixtures\Panels\TestingApiPanel;
use Tbtop\Admin\Tests\Fixtures\TestingApiPage;

class TestingApiTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        TestingApiPage::$submitted = null;
        Gate::define('view-testing-api', fn ($user): bool => ($user->role ?? 'editor') !== 'guest');
        Gate::define('archive-posts', fn ($user): bool => ($user->role ?? 'editor') === 'admin');
        Schema::create('caposts', function ($table): void {
            $table->id();
            $table->string('title');
            $table->boolean('published')->default(false);
        });
        $this->actingAs(new AuthUser);
    }

    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [TestingApiPanel::class]);
    }

    /** A user the gates read by role. */
    protected function userWithRole(string $role): AuthUser
    {
        return (new AuthUser)->forceFill(['role' => $role]);
    }
}
