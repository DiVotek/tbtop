<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Demo showcase only, not a package feature: `?nav=<layout>` switches the
 * panel's navigation layout for this session, so one panel shows every
 * layout. PanelConfig is built once per process, hence the shared-prop
 * override instead of reconfiguring the panel.
 */
class DemoNavigationLayout
{
    private const SESSION_KEY = 'demo.navigation';

    public function handle(Request $request, Closure $next): Response
    {
        $requested = $request->query('nav');
        if (is_string($requested) && in_array($requested, PanelConfig::NAVIGATIONS, true)) {
            $request->session()->put(self::SESSION_KEY, $requested);
        }

        $layout = $request->session()->get(self::SESSION_KEY);
        if (is_string($layout)) {
            $shared = Inertia::getShared('tbtop');
            Inertia::share('tbtop', static function () use ($shared, $layout): ?array {
                $tbtop = value($shared);

                return is_array($tbtop) ? [...$tbtop, 'navigation' => $layout] : $tbtop;
            });
        }

        return $next($request);
    }
}
