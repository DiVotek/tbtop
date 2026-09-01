<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireFullAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            return $this->toLogin($request, 'tbtop.admin.login-page');
        }

        if ($request->user()->hasTwoFactorEnabled()) {
            $completed = $request->session()->get('auth.2fa.completed', false);

            if (! $completed) {
                return $this->toLogin($request, 'tbtop.admin.two-factor-challenge-page');
            }
        }

        return $next($request);
    }

    /**
     * redirect()->guest() stashes the current URL as url.intended so the auth
     * pages can send the user back where they were headed. Only GET page loads
     * are worth resuming — a bounced POST/JSON would replay as a bare GET.
     */
    private function toLogin(Request $request, string $route): Response
    {
        if ($request->isMethod('GET') && ! $request->expectsJson()) {
            return redirect()->guest(route($route));
        }

        return redirect()->route($route);
    }
}
