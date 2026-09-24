<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;

/**
 * Shared page-gate enforcement reused by every page-scoped controller.
 *
 * Resolves the page class from the `tbtopPage` route parameter and calls
 * Gate::authorize() when the page declares a gate via Page::can() — see PageGate.
 */
trait AuthorizesPage
{
    private function authorizePageGate(Request $request): void
    {
        PageGate::authorize($request);
    }
}
