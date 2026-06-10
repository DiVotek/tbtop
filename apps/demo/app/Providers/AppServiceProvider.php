<?php

namespace App\Providers;

use App\Admin\Fields\Rating;
use Illuminate\Support\ServiceProvider;
use Tbtop\Admin\Dsl\S;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        S::register('rating', Rating::class);
    }
}
