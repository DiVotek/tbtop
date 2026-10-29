<?php

namespace Tbtop\Admin\Auth;

use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * The panel-aware `verified` middleware, last in PanelConfig::authStack(). It
 * acts only while the panel serves an EmailVerificationPage subclass and the
 * user implements MustVerifyEmail: an unverified user is sent to that page.
 * The verification page, the profile (to fix a mistyped address) and logout
 * stay reachable.
 */
final class RequireVerifiedEmail
{
    public function handle(Request $request, Closure $next): Response
    {
        $panel = CurrentPanel::current();
        $user = $panel === null ? null : Auth::guard($panel->guard())->user();
        if (! $user instanceof MustVerifyEmail || $user->hasVerifiedEmail() || $this->isExempt($request)) {
            return $next($request);
        }
        $url = EmailVerificationPage::currentUrl();
        if ($url === null) {
            return $next($request);
        }
        if ($request->expectsJson()) {
            abort(403, 'Your email address is not verified.');
        }

        return redirect()->guest($url);
    }

    private function isExempt(Request $request): bool
    {
        $page = $request->route('tbtopPage');
        if (is_string($page) && (is_a($page, EmailVerificationPage::class, true) || is_a($page, ProfilePage::class, true))) {
            return true;
        }

        return $request->routeIs('tbtop.*.logout');
    }
}
