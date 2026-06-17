<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Admin panel is the canonical surface: the auth middleware (priority-sorted
        // ahead of RequireFullAuth) sends all guests to the DSL login page.
        $middleware->redirectGuestsTo(fn (Request $request): string => route('tbtop.admin.login-page'));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
