<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * The per-panel `Route::fallback()`: any URL under the panel prefix that no
 * page or chrome route claims lands here, still inside the panel's
 * middleware stack, so the 404 renders with the panel chrome.
 */
final class PanelErrorController
{
    public function __invoke(Request $request, CurrentPanel $panel): Response
    {
        return PanelErrorPage::notFound($request, $panel);
    }
}
