<?php

namespace App\Admin\Pages;

use App\Auth\TwoFactorVerifier;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * DSL-authored 2FA challenge page, reached after login when the user has 2FA
 * enabled. Mirrors TwoFactorChallengeController::store(): verify a TOTP or
 * recovery code against the pending session user, then complete the session.
 *
 * Accepts the same code field for both authenticator and recovery codes.
 */
class TwoFactorChallengePage extends Page
{
    public static function path(): string
    {
        return 'two-factor-challenge';
    }

    /**
     * Public: the pending user is half-authenticated (post-credential, pre-2FA).
     * RequireFullAuth would bounce them back here in a loop, so skip it.
     */
    public static function middleware(PanelConfig $panel): array
    {
        return ['web'];
    }

    public function layout(): string
    {
        return 'center';
    }

    public function title(): string
    {
        return 'Two-factor challenge';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Two-factor authentication')->variant('heading'),
            $s->displayText('Enter the code from your authenticator app, or a recovery code.')
                ->variant('muted'),
            $s->form('challenge', [
                $s->otp('code')->label('Code')->length(6)->required(),
                $s->actionsRow([
                    $s->action('submit')->label('Verify')->color('primary')->submit(),
                ]),
            ])
                ->record(['code' => ''])
                ->onSubmit(fn (ActionCtx $ctx): string => $this->challenge($ctx)),
        ]);
    }

    /** Mirrors TwoFactorChallengeController::store(). Returns the next URL. */
    private function challenge(ActionCtx $ctx): string
    {
        $userId = $ctx->request->session()->get('auth.2fa.user_id');

        if (! $userId) {
            throw ValidationException::withMessages([
                'code' => 'Session expired. Please sign in again.',
            ]);
        }

        $user = User::findOrFail($userId);

        if (! app(TwoFactorVerifier::class)->verify($user, $ctx->form['code'])) {
            \Log::warning('auth.2fa.challenge_failed', ['user_id' => $user->id]);
            throw ValidationException::withMessages(['code' => 'Invalid verification code.']);
        }

        return $this->complete($ctx, $user);
    }

    private function complete(ActionCtx $ctx, User $user): string
    {
        Auth::login($user);
        $ctx->request->session()->forget('auth.2fa.user_id');
        $ctx->request->session()->put('auth.2fa.completed', true);
        $ctx->request->session()->regenerate();

        return route('tbtop.admin.dashboard-page', absolute: false);
    }
}
