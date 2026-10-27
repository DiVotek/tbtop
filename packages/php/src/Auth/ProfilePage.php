<?php

namespace Tbtop\Admin\Auth;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use LogicException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * The signed-in user's own name, email and password, behind the panel's auth
 * stack. A panel that serves a subclass gets a "Profile" entry at the top of
 * the user menu. Hooks: view(), profileForm(), passwordForm(), profileRules(),
 * passwordRules().
 */
abstract class ProfilePage extends Page
{
    use FindsHostPage;

    public static function path(): string
    {
        return 'profile';
    }

    /** A password change needs the browser session the page edits. */
    public static function mcp(): bool
    {
        return false;
    }

    public function title(): string
    {
        return __('tbtop-admin::admin.auth.profile.title');
    }

    /** One section per concern; a subclass appends its own (e.g. two-factor setup) after parent::view(). */
    public function view(S $s): Node
    {
        return $s->stack([$this->profileForm($s), $this->passwordForm($s)]);
    }

    protected function profileForm(S $s): FormBuilder
    {
        $user = $this->user();

        return $s->form('profile', [
            $s->section(['title' => __('tbtop-admin::admin.auth.profile.details'), 'variant' => 'card'], [
                $s->text('name')->label(__('tbtop-admin::admin.auth.profile.name'))->required(),
                $s->text('email')->label(__('tbtop-admin::admin.auth.login.email'))->required()->rules('email'),
                $s->password('current_password')->label(__('tbtop-admin::admin.auth.profile.current'))
                    ->helperText(__('tbtop-admin::admin.auth.profile.current_for_email')),
                $s->actionsRow([
                    $s->action('save')->label(__('tbtop-admin::admin.auth.profile.save'))->color('primary')->submit(),
                ]),
            ]),
        ])
            ->record(['name' => (string) $user->getAttribute('name'), 'email' => (string) $user->getAttribute('email'), 'current_password' => ''])
            ->onSubmit(fn (ActionCtx $ctx): Effects => $this->updateProfile($ctx));
    }

    protected function passwordForm(S $s): FormBuilder
    {
        return $s->form('password', [
            $s->section(['title' => __('tbtop-admin::admin.auth.profile.password'), 'variant' => 'card'], [
                $s->password('current_password')->label(__('tbtop-admin::admin.auth.profile.current'))->required(),
                $s->password('password')->label(__('tbtop-admin::admin.auth.reset.password'))->required(),
                $s->password('password_confirmation')->label(__('tbtop-admin::admin.auth.reset.confirm'))->required(),
                $s->actionsRow([
                    $s->action('change')->label(__('tbtop-admin::admin.auth.profile.change'))->color('primary')->submit(),
                ]),
            ]),
        ])
            ->guardUnsaved(false)
            ->record(['current_password' => '', 'password' => '', 'password_confirmation' => ''])
            ->onSubmit(fn (ActionCtx $ctx): Effects => $this->updatePassword($ctx));
    }

    /** @return array<string, list<mixed>> Laravel rules for the profile form; the email stays unique among users. */
    protected function profileRules(Model $user): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique($user->getTable(), 'email')->ignore($user)],
        ];
    }

    /** @return list<mixed> Laravel rules for the new password; `confirmed` pairs it with password_confirmation. */
    protected function passwordRules(): array
    {
        return ['required', 'string', 'confirmed', PasswordRule::defaults()];
    }

    /**
     * A new email needs the current password: with it, a hijacked session
     * could otherwise redirect password resets and take the account over.
     * A changed email on a MustVerifyEmail user is marked unverified, as Breeze does.
     */
    protected function updateProfile(ActionCtx $ctx): Effects
    {
        $user = $this->user();
        $user->forceFill(Validator::make($ctx->form, $this->profileRules($user))->validate());
        if ($user->isDirty('email')) {
            $this->confirmCurrentPassword($user, $ctx->form['current_password'] ?? null);
            if ($user instanceof MustVerifyEmail) {
                $user->setAttribute('email_verified_at', null);
            }
        }
        $user->save();

        return Effects::make()->notify(__('tbtop-admin::admin.auth.profile.saved'))->resetForm('profile');
    }

    /**
     * The panel stack's AuthenticateSession signs other sessions and their
     * remember cookies out (both carry the old hash) and re-stores this
     * session's hash after the request, so this session stays signed in.
     * remember_token is left alone: rotating it would also void this
     * device's own remember cookie.
     */
    protected function updatePassword(ActionCtx $ctx): Effects
    {
        $user = $this->user();
        $data = Validator::make($ctx->form, ['password' => $this->passwordRules()])->validate();
        $this->confirmCurrentPassword($user, $ctx->form['current_password'] ?? null);

        $user->forceFill(['password' => Hash::make($data['password'])])->save();

        return Effects::make()->notify(__('tbtop-admin::admin.auth.profile.changed'))->resetForm('password');
    }

    /** Throws under current_password unless it matches; wrong ones are throttled per user, five a minute. */
    protected function confirmCurrentPassword(Authenticatable $user, mixed $password): void
    {
        $key = 'tbtop-profile-password|'.$user->getAuthIdentifier();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'current_password' => __('tbtop-admin::admin.auth.profile.throttle', ['seconds' => $seconds]),
            ]);
        }
        if (! is_string($password) || $password === '') {
            throw ValidationException::withMessages([
                'current_password' => __('validation.required', ['attribute' => __('tbtop-admin::admin.auth.profile.current')]),
            ]);
        }
        if (! Hash::check($password, $user->getAuthPassword())) {
            RateLimiter::hit($key);
            throw ValidationException::withMessages(['current_password' => __('auth.password')]);
        }
        RateLimiter::clear($key);
    }

    /** The panel guard's user; the page sits behind auth:{guard}, so there always is one. */
    protected function user(): Authenticatable&Model
    {
        $user = Auth::guard(static::panel()->guard())->user();
        if (! $user instanceof Model) {
            throw new LogicException('ProfilePage needs an Eloquent user on the panel guard.');
        }

        return $user;
    }
}
