<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Demo-only: `?nav=<layout>` picks the navigation layout for the session.
 * PanelConfig is built once per process, so the shared prop is overridden instead.
 */
class DemoNavigationLayout
{
    public const SESSION_KEY = 'demo.navigation';

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
