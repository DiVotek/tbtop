<?php

namespace Tbtop\Admin\Auth;

use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Sets a new password from a reset link. Hooks: view(), passwordRules(), broker().
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

    /** The password broker from config/auth.php that issued the token. */
    protected function broker(): string
    {
        return (string) config('auth.defaults.passwords');
    }

    /** Rotating remember_token signs out other devices that kept a remember cookie. */
    private function resetPassword(ActionCtx $ctx): Effects
    {
        Validator::make($ctx->form, ['password' => $this->passwordRules()])->validate();

        $status = Password::broker($this->broker())->reset(
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
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return Effects::make()->notify(__($status))->redirect(LoginPage::url() ?? static::panel()->pathPrefix());
    }
}
