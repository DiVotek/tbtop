<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use LogicException;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * Uses the panel's guard, not the app default. Lands on the panel root: the package
 * has no login page, so the host's guest redirect takes it from there.
 */
final class LogoutController
{
    public function __invoke(Request $request): RedirectResponse
    {
        $panel = CurrentPanel::current() ?? throw new LogicException('Logout route served outside a panel.');

        Auth::guard($panel->guard())->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect($panel->pathPrefix());
    }
}
