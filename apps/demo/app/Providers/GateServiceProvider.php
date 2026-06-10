<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class GateServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::define('view-dashboard', function (mixed $user): bool {
            return isset($user->role) && $user->role === 'admin';
        });
    }
}
