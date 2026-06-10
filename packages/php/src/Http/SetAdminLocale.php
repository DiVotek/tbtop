<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\I18n\LocaleService;

class SetAdminLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        app()->setLocale(LocaleService::currentLocale());

        return $next($request);
    }
}
