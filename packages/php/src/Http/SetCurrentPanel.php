<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelRegistry;

/**
 * Route middleware `SetCurrentPanel:{id}` — binds the request's panel
 * into the container so downstream readers resolve CurrentPanel.
 */
class SetCurrentPanel
{
    public function __construct(private readonly PanelRegistry $registry) {}

    public function handle(Request $request, Closure $next, string $panelId): Response
    {
        app()->instance(CurrentPanel::class, new CurrentPanel($this->registry->get($panelId)));

        return $next($request);
    }
}
