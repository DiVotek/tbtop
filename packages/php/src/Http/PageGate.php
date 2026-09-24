<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Pages\Page;

/**
 * The page gate (Page::can()) — one implementation for the page-scoped
 * controllers (AuthorizesPage) and the MCP server's discovery.
 */
final class PageGate
{
    /** Gate::authorize() the page on $request's matched route (its `tbtopPage`), if it declares a gate. */
    public static function authorize(Request $request): void
    {
        $class = $request->route()?->parameter('tbtopPage');
        if (! is_string($class) || ! is_subclass_of($class, Page::class)) {
            return;
        }
        $gate = $class::can();
        if ($gate !== null) {
            Gate::authorize($gate);
        }
    }

    /** @param  class-string<Page>  $class */
    public static function allows(string $class): bool
    {
        $gate = $class::can();

        return $gate === null || Gate::allows($gate);
    }
}
