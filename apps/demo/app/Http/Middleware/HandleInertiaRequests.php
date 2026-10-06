<?php

namespace App\Http\Middleware;

use Inertia\Middleware;

/**
 * The host's Inertia middleware: asset versioning, the shared errors bag and
 * 303 redirects. The admin panel brings its own props (`tbtop`) and sets its
 * root view per response, so nothing is shared here.
 */
class HandleInertiaRequests extends Middleware
{
    /** @var string */
    protected $rootView = 'admin';
}
