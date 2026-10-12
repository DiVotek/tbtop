<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Tbtop\Admin\Auth\LoginPage;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // The demo runs behind the Amp portal (and similar TLS-terminating proxies),
        // so generated asset and navigation URLs must honor X-Forwarded-Proto.
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Admin panel is the canonical surface: the auth middleware (priority-sorted
        // ahead of RequireFullAuth) sends all guests to the DSL login page.
        $middleware->alias(['abilities' => CheckAbilities::class]);

        $middleware->redirectGuestsTo(fn (): string => LoginPage::url() ?? route('tbtop.admin.login-page'));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
