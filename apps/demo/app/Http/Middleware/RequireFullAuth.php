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
            return redirect()->route('login');
        }

        if ($request->user()->hasTwoFactorEnabled()) {
            $completed = $request->session()->get('auth.2fa.completed', false);

            if (! $completed) {
                return redirect()->route('two-factor.challenge');
            }
        }

        return $next($request);
    }
}
