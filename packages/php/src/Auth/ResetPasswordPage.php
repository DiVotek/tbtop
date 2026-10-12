<?php

namespace Tbtop\Admin\Auth;

use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Sets a new password from a reset link. Hooks: view(), passwordRules(). The broker
 * comes from PanelConfig::passwordBroker().
 */
abstract class ResetPasswordPage extends AuthPage
{
    public static function path(): string
    {
        return 'reset-password/{token}';
    }

    public function title(): string
    {
        return __('tbtop-admin::admin.auth.reset.title');
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText(__('tbtop-admin::admin.auth.reset.title'))->variant('heading'),
            $s->form('reset', [
                $s->text('email')->label(__('tbtop-admin::admin.auth.login.email'))->required()->rules('email'),
                $s->password('password')->label(__('tbtop-admin::admin.auth.reset.password'))->required(),
                $s->password('password_confirmation')->label(__('tbtop-admin::admin.auth.reset.confirm'))->required(),
                $s->actionsRow([
                    $s->action('submit')->label(__('tbtop-admin::admin.auth.reset.submit'))->color('primary')->submit(),
                ]),
            ])
                ->guardUnsaved(false)
                ->record(['email' => (string) request()->query('email', ''), 'password' => '', 'password_confirmation' => ''])
                ->onSubmit(fn (ActionCtx $ctx): Effects => $this->resetPassword($ctx)),
        ]);
    }

    /** @return list<mixed> Laravel rules for the new password; `confirmed` pairs it with password_confirmation. */
    protected function passwordRules(): array
    {
        return ['required', 'confirmed', PasswordRule::defaults()];
    }

    /**
     * Rotating remember_token signs out other devices that kept a remember cookie.
     * Failed attempts are throttled per IP: a guessed email gets five tries a minute.
     */
    protected function resetPassword(ActionCtx $ctx): Effects
    {
        Validator::make($ctx->form, ['password' => $this->passwordRules()])->validate();

        $key = 'tbtop-reset|'.$ctx->request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => __('auth.throttle', ['seconds' => $seconds, 'minutes' => ceil($seconds / 60)]),
            ]);
        }

        $status = Password::broker(static::panel()->passwordBroker())->reset(
            [
                'email' => $ctx->form['email'],
                'password' => $ctx->form['password'],
                'password_confirmation' => $ctx->form['password_confirmation'],
                'token' => $ctx->params['token'] ?? '',
            ],
            static function (Authenticatable&Model $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            RateLimiter::hit($key);
            // An unknown email answers like a bad token, or this form tells which accounts exist.
            $shown = $status === Password::INVALID_USER ? Password::INVALID_TOKEN : $status;
            throw ValidationException::withMessages(['email' => __($shown)]);
        }

        return Effects::make()->notify(__($status))->redirect(LoginPage::url() ?? static::panel()->pathPrefix());
    }
}
