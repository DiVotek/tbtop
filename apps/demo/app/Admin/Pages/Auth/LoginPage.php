<?php

namespace App\Admin\Pages\Auth;

use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Auth;
use Tbtop\Admin\Actions\ActionCtx;

/**
 * Sign-in screen at {prefix}/login. Behaviour lives in the package base, so
 * fixes arrive with composer update. Override a hook here to change it:
 *
 *   view(S $s)                     the screen
 *   credentials(ActionCtx $ctx)    what the user is matched by
 *   afterAuthenticated($user, $ctx) return a URL to send the user elsewhere (e.g. a 2FA challenge)
 *   redirectTo(ActionCtx $ctx)     where a signed-in user lands
 *   throttleKey(ActionCtx $ctx), maxAttempts()
 *
 * Delete this file to drop the screen.
 *
 * The afterAuthenticated() override is the demo's 2FA hand-off.
 */
class LoginPage extends \Tbtop\Admin\Auth\LoginPage
{
    /** A 2FA user is signed back out and parked in the session until the challenge page verifies a code. */
    protected function afterAuthenticated(Authenticatable $user, ActionCtx $ctx): ?string
    {
        if (! $user instanceof User || ! $user->hasTwoFactorEnabled()) {
            return null;
        }

        Auth::guard('web')->logout();
        $ctx->request->session()->put('auth.2fa.user_id', $user->getAuthIdentifier());
        $ctx->request->session()->put('auth.2fa.completed', false);

        return route('tbtop.admin.two-factor-challenge-page', absolute: false);
    }
}
