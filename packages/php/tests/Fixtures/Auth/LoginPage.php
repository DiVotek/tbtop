<?php

namespace Tbtop\Admin\Tests\Fixtures\Auth;

use Closure;
use Illuminate\Contracts\Auth\Authenticatable;
use Tbtop\Admin\Actions\ActionCtx;

/** What admin:install --auth publishes into a host, plus a test seam on afterAuthenticated(). */
class LoginPage extends \Tbtop\Admin\Auth\LoginPage
{
    /** @var (Closure(Authenticatable, ActionCtx): ?string)|null */
    public static ?Closure $afterAuthenticated = null;

    protected function afterAuthenticated(Authenticatable $user, ActionCtx $ctx): ?string
    {
        return self::$afterAuthenticated === null ? null : (self::$afterAuthenticated)($user, $ctx);
    }
}
