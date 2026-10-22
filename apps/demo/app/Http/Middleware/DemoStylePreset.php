<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * Demo-only: `?style=<preset>` picks the shadcn style preset for the session.
 * PanelConfig is built once per process, so the shared prop is overridden instead
 * of the panel config — one visitor's pick never reaches another.
 */
class DemoStylePreset
{
    public const SESSION_KEY = 'demo.style';

    public const STYLES = ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'];

    public function handle(Request $request, Closure $next): Response
    {
        $requested = $request->query('style');
        if (is_string($requested) && in_array($requested, self::STYLES, true)) {
            $request->session()->put(self::SESSION_KEY, $requested);
        }

        $style = self::chosen();
        if ($style !== null) {
            $shared = Inertia::getShared('tbtop');
            Inertia::share('tbtop', static function () use ($shared, $style): ?array {
                $tbtop = value($shared);
                if (! is_array($tbtop)) {
                    return $tbtop;
                }

                return [...$tbtop, 'appearance' => [...($tbtop['appearance'] ?? []), 'stylePreset' => $style]];
            });
        }

        return $next($request);
    }

    /** The style this visitor picked, or null to keep the panel's own. */
    public static function chosen(): ?string
    {
        $style = session(self::SESSION_KEY);

        return is_string($style) && in_array($style, self::STYLES, true) ? $style : null;
    }

    /** The `<html>` class for the first paint: the visitor's pick, else the panel's style. */
    public static function htmlClass(): ?string
    {
        $style = self::chosen();

        return $style !== null ? "style-preset-{$style}" : CurrentPanel::current()?->stylePresetClass();
    }
}
