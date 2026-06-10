<?php

namespace App\Providers;

use App\Admin\Fields\Rating;
use App\Http\Responses\PasskeyLoginResponse;
use App\Http\Responses\PasskeyRegistrationResponse;
use Illuminate\Support\ServiceProvider;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;
use Laravel\Passkeys\Contracts\PasskeyRegistrationResponse as PasskeyRegistrationResponseContract;
use Tbtop\Admin\Dsl\S;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Custom passkey responses: login marks 2FA completed; registration logs and acks.
        $this->app->singleton(PasskeyLoginResponseContract::class, PasskeyLoginResponse::class);
        $this->app->singleton(PasskeyRegistrationResponseContract::class, PasskeyRegistrationResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        S::register('rating', Rating::class);
    }
}
