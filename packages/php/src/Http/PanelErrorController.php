<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * The per-panel `Route::fallback()`: any URL under the panel prefix that no
 * page or chrome route claims lands here, still inside the panel's
 * middleware stack (GET|HEAD only — Route::fallback() never matches other
 * verbs), so the 404 renders with the panel chrome.
 */
final class PanelErrorController
{
    public function __invoke(Request $request, CurrentPanel $panel): Response
    {
        // Mirrors the exception-renderable guard in AdminServiceProvider: a
        // JSON client (an XHR to an unknown URL) gets Laravel's default JSON
        // 404, not the Inertia error page.
        if ($request->expectsJson()) {
            throw new NotFoundHttpException;
        }

        return PanelErrorPage::notFound($request, $panel);
    }
}
