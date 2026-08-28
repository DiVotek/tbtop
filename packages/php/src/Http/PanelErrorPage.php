<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * The `admin/error` Inertia page: an HTTP error rendered inside the panel
 * chrome. Chrome props (nav, brand, locale, ...) arrive through the shared
 * `tbtop` prop exactly as they do for `admin/page`, so the response only
 * carries the status and its human text.
 */
final class PanelErrorPage
{
    public static function notFound(Request $request, CurrentPanel $panel): Response
    {
        return self::render(
            $request,
            $panel,
            404,
            self::text('tbtop-admin::admin.state.pageNotFound', 'Page not found'),
            self::text('tbtop-admin::admin.state.pageNotFoundHint', 'The page you are looking for does not exist or has moved.'),
        );
    }

    public static function render(Request $request, CurrentPanel $panel, int $status, string $title, string $message): Response
    {
        // A 404 can be raised from a public bucket (e.g. the login page's own
        // data/action routes), reached before the panel's auth guard ever
        // runs. Rendering panel chrome there would leak nav/brand to a guest,
        // so an unauthenticated visitor gets the chrome-less center layout —
        // the same one LoginPage itself uses.
        $layout = Auth::guard($panel->guard())->check() ? 'admin' : 'center';

        // toResponse() picks the Inertia JSON envelope for X-Inertia requests
        // and the root view otherwise; the status is applied on top of either.
        return Inertia::render('admin/error', [
            'status' => $status,
            'title' => $title,
            'message' => $message,
            'layout' => $layout,
        ])
            ->rootView($panel->rootView())
            ->toResponse($request)
            ->setStatusCode($status);
    }

    private static function text(string $key, string $fallback): string
    {
        $translated = trans()->get($key);

        return is_string($translated) && $translated !== $key ? $translated : $fallback;
    }
}
