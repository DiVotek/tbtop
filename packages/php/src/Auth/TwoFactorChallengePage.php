<?php

namespace Tbtop\Admin\Auth;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Auth\TwoFactor\EnsureChallengeIsPending;
use Tbtop\Admin\Auth\TwoFactor\TwoFactorCodes;
use Tbtop\Admin\Auth\TwoFactor\TwoFactorSession;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * The second sign-in step: a code from the authenticator app, or a recovery
 * code. While the panel serves a subclass, the login sends users with a
 * second factor here instead of signing them in, the panel stack sends back
 * any session that has not passed it, and the profile page offers to turn it
 * on. Hooks: view(), redirectTo().
 */
abstract class TwoFactorChallengePage extends AuthPage
{
    public static function path(): string
    {
        return 'two-factor-challenge';
    }

    /** Not RedirectSignedInUsers: a user a remember cookie signed in still owes the code. */
    public static function middleware(PanelConfig $panel): array
    {
        return ['web', EnsureChallengeIsPending::class];
    }

    public function title(): string
    {
        return __('tbtop-admin::admin.auth.two_factor.title');
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText(__('tbtop-admin::admin.auth.two_factor.title'))->variant('heading'),
            $s->displayText(__('tbtop-admin::admin.auth.two_factor.prompt'))->variant('muted'),
            $s->form('challenge', [
                // Text, not otp: otp()->length(6) renders six digit slots and adds digits:6, which would refuse recovery codes.
                $s->text('code')->label(__('tbtop-admin::admin.auth.two_factor.code'))->required()->rules(['string', 'max:64'])
                    ->placeholder(__('tbtop-admin::admin.auth.two_factor.code_placeholder')),
                $s->actionsRow([
                    $s->action('submit')->label(__('tbtop-admin::admin.auth.two_factor.verify'))->color('primary')->submit(),
                ]),
            ])
                ->guardUnsaved(false)
                ->record(['code' => ''])
                ->onSubmit(fn (ActionCtx $ctx): string => $this->challenge($ctx)),
        ]);
    }

    /** The URL the guest was bounced from, else the panel root. */
    protected function redirectTo(ActionCtx $ctx): string
    {
        $intended = $ctx->request->session()->pull('url.intended');

        return is_string($intended) && $intended !== '' ? $intended : static::panel()->pathPrefix();
    }

    /** The security core — throttle, verify, sign in, renew the session. A subclass that rebuilds view() calls it. */
    protected function challenge(ActionCtx $ctx): string
    {
        $session = new TwoFactorSession($ctx->request->session(), static::panel()->guard());
        $user = $session->challengedUser();
        if (! $user instanceof Model) {
            throw ValidationException::withMessages(['code' => __('tbtop-admin::admin.auth.two_factor.expired')]);
        }
        if (TwoFactorCodes::isLockedOut($user) || ! TwoFactorCodes::verify($user, (string) $ctx->form['code'])) {
            $message = TwoFactorCodes::isLockedOut($user) ? TwoFactorCodes::lockoutMessage($user) : __('tbtop-admin::admin.auth.two_factor.invalid');
            // A lockout drops the parked sign-in: further guesses need the password again.
            if (TwoFactorCodes::isLockedOut($user)) {
                $session->forgetParked();
            }
            throw ValidationException::withMessages(['code' => $message]);
        }

        $guard = Auth::guard(static::panel()->guard());
        // A parked sign-in is completed here; a user a remember cookie signed in already is.
        if ($guard->user()?->getAuthIdentifier() !== $user->getAuthIdentifier()) {
            $guard->login($user, $session->remembers());
        }
        $session->forgetParked();
        $session->pass($user);
        $ctx->request->session()->regenerate();

        return $this->redirectTo($ctx);
    }
}
