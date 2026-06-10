<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Pages\Page;

/**
 * Shared page-gate enforcement reused by every page-scoped controller.
 *
 * Resolves the page class from the `tbtopPage` route parameter and calls
 * Gate::authorize() when the page declares a gate via Page::can().
 * Identical semantics to PageController — one authoritative implementation.
 */
trait AuthorizesPage
{
    private function authorizePageGate(Request $request): void
    {
        $class = $request->route()?->parameter('tbtopPage');

        if (is_string($class) && is_subclass_of($class, Page::class)) {
            $gate = $class::can();
            if ($gate !== null) {
                Gate::authorize($gate);
            }
        }
    }
}
