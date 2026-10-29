<?php

namespace Tbtop\Admin\Auth\TwoFactor;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Auth\LoginPage;
use Tbtop\Admin\Panels\CurrentPanel;

/** Keeps the challenge page to those who owe a code; anyone else goes to the login, which sends a signed-in user on into the panel. */
final class EnsureChallengeIsPending
{
    public function handle(Request $request, Closure $next): Response
    {
        $panel = CurrentPanel::current();
        if ($panel === null || (new TwoFactorSession($request->session(), $panel->guard()))->challengedUser() !== null) {
            return $next($request);
        }

        return redirect(LoginPage::currentUrl() ?? $panel->pathPrefix());
    }
}
