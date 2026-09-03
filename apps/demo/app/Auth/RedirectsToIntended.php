<?php

namespace App\Auth;

use Illuminate\Http\Request;

/**
 * Shared by the DSL auth pages, whose onSubmit returns a URL string rather than
 * a RedirectResponse — so they cannot use redirect()->intended() and must read
 * the stashed key themselves. RequireFullAuth writes it via redirect()->guest().
 */
trait RedirectsToIntended
{
    /**
     * The URL the guest was bounced from, else the dashboard. pull() clears the
     * key so a later sign-in does not reuse a stale destination.
     */
    private function intendedUrl(Request $request): string
    {
        $intended = $request->session()->pull('url.intended');

        return is_string($intended) && $intended !== ''
            ? $intended
            : route('tbtop.admin.dashboard-page', absolute: false);
    }
}
