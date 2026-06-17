<?php

namespace App\Admin\Pages;

use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * DSL-authored login page on the chrome-less center layout. The onSubmit
 * closure runs the same auth flow as AuthenticatedSessionController::store():
 * attempt credentials, and if the user has 2FA enabled, hand off to the
 * challenge page instead of completing the session.
 *
 * The closure returns a redirect URL string — FormSubmitController turns a
 * string return into redirect($string).
 */
class LoginPage extends Page
{
    public static function path(): string
    {
        return 'login';
    }

    /** Public: reachable without the panel's auth guard or RequireFullAuth. */
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
        return 'Sign in';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Sign in')->variant('heading'),
            $s->form('login', [
                $s->text('email')->label('Email')->required(),
                $s->password('password')->label('Password')->required(),
                $s->actionsRow([
                    $s->action('submit')->label('Sign in')->color('primary')->submit(),
                ]),
            ])
                ->record(['email' => '', 'password' => ''])
                ->onSubmit(fn (ActionCtx $ctx): string => $this->authenticate($ctx)),
        ]);
    }

    /** Mirrors AuthenticatedSessionController::store(). Returns the next URL. */
    private function authenticate(ActionCtx $ctx): string
    {
        $credentials = [
            'email' => $ctx->form['email'],
            'password' => $ctx->form['password'],
        ];

        if (! Auth::attempt($credentials, remember: false)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        $user = Auth::user();

        if ($user->hasTwoFactorEnabled()) {
            return $this->startTwoFactorChallenge($ctx);
        }

        $ctx->request->session()->regenerate();

        return route('tbtop.admin.dashboard-page', absolute: false);
    }

    /** Log out, stash the pending user in session, send to the challenge page. */
    private function startTwoFactorChallenge(ActionCtx $ctx): string
    {
        $userId = Auth::id();
        Auth::logout();
        $ctx->request->session()->put('auth.2fa.user_id', $userId);
        $ctx->request->session()->put('auth.2fa.completed', false);

        return route('tbtop.admin.two-factor-challenge-page', absolute: false);
    }
}
