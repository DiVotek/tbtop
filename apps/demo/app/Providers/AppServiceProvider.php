<?php

namespace App\Providers;

use App\Admin\Fields\Rating;
use App\Http\Controllers\WebAuthn\WebAuthnLoginController;
use App\Http\Controllers\WebAuthn\WebAuthnRegisterController;
use Illuminate\Support\ServiceProvider;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse;
use Laravel\Passkeys\Contracts\PasskeyRegistrationResponse;
use Tbtop\Admin\Dsl\S;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Custom passkey responses: login marks 2FA completed; registration logs and acks.
        $this->app->singleton(PasskeyLoginResponse::class, WebAuthnLoginController::class);
        $this->app->singleton(PasskeyRegistrationResponse::class, WebAuthnRegisterController::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        S::register('rating', Rating::class);
    }
}
