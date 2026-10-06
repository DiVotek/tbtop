<?php

namespace Tbtop\Admin\Auth;

use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use LogicException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Requests a password reset link. The mail links to the panel's reset page,
 * not Laravel's `password.reset` route. Hooks: view(), broker().
 */
abstract class ForgotPasswordPage extends AuthPage
{
    public static function path(): string
    {
        return 'forgot-password';
    }

    public function title(): string
    {
        return __('tbtop-admin::admin.auth.forgot.title');
    }

    public function view(S $s): Node
    {
        $loginUrl = LoginPage::url();

        return $s->stack([
            $s->displayText(__('tbtop-admin::admin.auth.forgot.title'))->variant('heading'),
            $s->form('forgot', [
                $s->text('email')->label(__('tbtop-admin::admin.auth.login.email'))->required()->rules('email'),
                $s->actionsRow([
                    $s->action('submit')->label(__('tbtop-admin::admin.auth.forgot.submit'))->color('primary')->submit(),
                    ...($loginUrl === null ? [] : [
                        $s->action('back')->label(__('tbtop-admin::admin.auth.forgot.back'))->url($loginUrl)->link(),
                    ]),
                ]),
            ])
                ->guardUnsaved(false)
                ->record(['email' => ''])
                ->onSubmit(fn (ActionCtx $ctx): Effects => $this->sendLink($ctx)),
        ]);
    }

    /** The password broker from config/auth.php that issues the token. */
    protected function broker(): string
    {
        return (string) config('auth.defaults.passwords');
    }

    /**
     * Every outcome but the per-IP throttle answers the same: the broker only
     * throttles existing accounts, so a distinct message would reveal them.
     */
    private function sendLink(ActionCtx $ctx): Effects
    {
        $key = 'tbtop-forgot|'.$ctx->request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => __('auth.throttle', ['seconds' => $seconds, 'minutes' => ceil($seconds / 60)]),
            ]);
        }
        RateLimiter::hit($key);

        $resetRoute = ResetPasswordPage::routeName()
            ?? throw new LogicException('The panel has no ResetPasswordPage for the reset link to open.');
        Password::broker($this->broker())->sendResetLink(
            ['email' => $ctx->form['email']],
            static function (CanResetPassword $user, string $token) use ($resetRoute): void {
                $url = route($resetRoute, ['token' => $token, 'email' => $user->getEmailForPasswordReset()]);
                Notification::send($user, new ResetPasswordNotification($token, $url));
            },
        );

        return Effects::make()->notify(__('tbtop-admin::admin.auth.forgot.sent'))->resetForm();
    }
}
