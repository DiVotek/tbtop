<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Auth\LoginPage;
use Tbtop\Admin\Tests\Fixtures\Auth\AuthUser;
use Tbtop\Admin\Tests\Fixtures\Panels\AuthPanel;

class AuthHttpTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // The manual step admin:install --auth prints for bootstrap/app.php. Applied after the
        // kernel resolves: resolving it installs the skeleton's route('login') default.
        $this->app->make(HttpKernel::class);
        (new Middleware)->redirectGuestsTo(static fn (): string => LoginPage::url() ?? '/admin/login');
        Route::getRoutes()->refreshNameLookups();
    }

    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('database.connections.testing', ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('auth.providers.users.model', AuthUser::class);
        $app['config']->set('auth.guards.staff', ['driver' => 'session', 'provider' => 'users']);
        $app['config']->set('tbtop-admin.panels', [AuthPanel::class]);
    }

    protected function defineDatabaseMigrations(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('password_reset_tokens', function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }
}
