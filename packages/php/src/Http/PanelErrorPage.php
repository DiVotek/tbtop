<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
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
        // toResponse() picks the Inertia JSON envelope for X-Inertia requests
        // and the root view otherwise; the status is applied on top of either.
        return Inertia::render('admin/error', [
            'status' => $status,
            'title' => $title,
            'message' => $message,
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
