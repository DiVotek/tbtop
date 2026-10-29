<?php

namespace Tbtop\Admin\Auth\TwoFactor;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Auth\TwoFactorChallengePage;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * The last layer of the panel's authStack(): a signed-in user with a second
 * factor who has not passed it in this session goes to the challenge. A no-op
 * while the panel serves no TwoFactorChallengePage subclass. Logout stays open.
 */
final class RequireTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $panel = CurrentPanel::current();
        $challenge = TwoFactorChallengePage::routeName();
        if ($panel === null || $challenge === null || $request->routeIs('tbtop.'.$panel->id().'.logout')) {
            return $next($request);
        }
        $user = Auth::guard($panel->guard())->user();
        if ($user === null || ! TwoFactorCodes::isEnabled($user) || (new TwoFactorSession($request->session(), $panel->guard()))->hasPassed($user)) {
            return $next($request);
        }
        if ($request->expectsJson()) {
            abort(403, __('tbtop-admin::admin.auth.two_factor.required'));
        }

        // Only a GET page load is worth resuming after the challenge; a bounced POST would replay as a bare GET.
        return $request->isMethod('GET') ? redirect()->guest(route($challenge, absolute: false)) : redirect()->route($challenge);
    }
}
