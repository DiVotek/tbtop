<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Switches the Inertia root view to 'admin' for admin route group requests.
 * Must be applied before HandleInertiaRequests renders the first-visit HTML.
 */
class SetAdminRootView
{
    public function handle(Request $request, Closure $next): Response
    {
        Inertia::setRootView('admin');

        return $next($request);
    }
}
