<?php

namespace Tbtop\Admin\Auth;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * The panel-aware `guest` middleware of the auth pages. Laravel's own `guest`
 * sends a signed-in user to the app's dashboard/home route, which knows
 * nothing of panels; this one lands them on the panel root.
 */
final class RedirectSignedInUsers
{
    public function handle(Request $request, Closure $next): Response
    {
        $panel = CurrentPanel::current();
        if ($panel === null || ! Auth::guard($panel->guard())->check()) {
            return $next($request);
        }

        return redirect($panel->pathPrefix());
    }
}
