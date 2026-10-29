<?php

namespace Tbtop\Admin\Http;

use Illuminate\Auth\Events\Verified;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use LogicException;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * The signed link from VerifyEmailNotification. Checked against the signed-in
 * user, as Laravel's EmailVerificationRequest does: a link opened in another
 * user's session answers 403. Lands on the page the user was sent away from,
 * else the panel root.
 */
final class VerifyEmailController
{
    public function __invoke(string $id, string $hash): RedirectResponse
    {
        $panel = CurrentPanel::current() ?? throw new LogicException('Verify route served outside a panel.');
        $user = Auth::guard($panel->guard())->user();
        if (! $user instanceof MustVerifyEmail
            || ! hash_equals((string) $user->getAuthIdentifier(), $id)
            || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            abort(403);
        }

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }
        Inertia::flash('tbtop.effects', Effects::make()->notify(__('tbtop-admin::admin.auth.verify.verified'))->jsonSerialize());

        return redirect()->intended($panel->pathPrefix());
    }
}
