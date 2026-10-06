<?php

namespace Tbtop\Admin\Auth;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use LogicException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Email + password sign-in on the panel's guard. Hooks: view(), credentials(),
 * afterAuthenticated(), redirectTo(), throttleKey(), maxAttempts().
 */
abstract class LoginPage extends AuthPage
{
    public static function path(): string
    {
        return 'login';
    }

    public function title(): string
    {
        return __('tbtop-admin::admin.auth.login.title');
    }

    public function view(S $s): Node
    {
        $forgotUrl = ForgotPasswordPage::url();

        return $s->stack([
            $s->displayText(__('tbtop-admin::admin.auth.login.title'))->variant('heading'),
            $s->form('login', [
                $s->text('email')->label(__('tbtop-admin::admin.auth.login.email'))->required()->rules('email'),
                $s->password('password')->label(__('tbtop-admin::admin.auth.login.password'))->required(),
                $s->checkbox('remember')->label(__('tbtop-admin::admin.auth.login.remember')),
                $s->actionsRow([
                    $s->action('submit')->label(__('tbtop-admin::admin.auth.login.submit'))->color('primary')->submit(),
                    ...($forgotUrl === null ? [] : [
                        $s->action('forgot')->label(__('tbtop-admin::admin.auth.login.forgot'))->url($forgotUrl)->link(),
                    ]),
                ]),
            ])
                ->record(['email' => '', 'password' => '', 'remember' => false])
                ->onSubmit(fn (ActionCtx $ctx): string => $this->authenticate($ctx)),
        ]);
    }

    /** @return array<string, mixed> What the guard's provider matches the user by, plus the password. */
    protected function credentials(ActionCtx $ctx): array
    {
        return ['email' => $ctx->form['email'], 'password' => $ctx->form['password']];
    }

    /**
     * Runs after the session is established. A URL sends the user there instead
     * of redirectTo() — e.g. a second-factor challenge after logging back out.
     */
    protected function afterAuthenticated(Authenticatable $user, ActionCtx $ctx): ?string
    {
        return null;
    }

    /** The URL the guest was bounced from, else the panel root. */
    protected function redirectTo(ActionCtx $ctx): string
    {
        $intended = $ctx->request->session()->pull('url.intended');

        return is_string($intended) && $intended !== '' ? $intended : static::panel()->pathPrefix();
    }

    protected function throttleKey(ActionCtx $ctx): string
    {
        return Str::transliterate(Str::lower((string) $ctx->form['email']).'|'.$ctx->request->ip());
    }

    /** Failed attempts allowed per throttle key per minute. */
    protected function maxAttempts(): int
    {
        return 5;
    }

    /** The security core — throttle, attempt, regenerate — stays fixed; the hooks wrap it. */
    private function authenticate(ActionCtx $ctx): string
    {
        $key = 'tbtop-login|'.$this->throttleKey($ctx);
        if (RateLimiter::tooManyAttempts($key, $this->maxAttempts())) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => __('auth.throttle', ['seconds' => $seconds, 'minutes' => ceil($seconds / 60)]),
            ]);
        }

        $guard = Auth::guard(static::panel()->guard());
        if (! $guard->attempt($this->credentials($ctx), (bool) ($ctx->form['remember'] ?? false))) {
            RateLimiter::hit($key);
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        RateLimiter::clear($key);
        $ctx->request->session()->regenerate();

        $user = $guard->user() ?? throw new LogicException('The guard accepted the credentials but holds no user.');

        return $this->afterAuthenticated($user, $ctx) ?? $this->redirectTo($ctx);
    }
}
