<?php

namespace Tbtop\Admin\Auth;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use LogicException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Where a signed-in `MustVerifyEmail` user with an unverified email lands
 * while the panel serves a subclass: RequireVerifiedEmail sends them here
 * from every other panel page. Mails a signed link to `{path}/{id}/{hash}`,
 * which VerifyEmailController checks. Hooks: view(), maxAttempts().
 */
abstract class EmailVerificationPage extends Page
{
    use FindsHostPage;

    public static function path(): string
    {
        return 'verify-email';
    }

    /** Verifying needs the browser session the link is checked against. */
    public static function mcp(): bool
    {
        return false;
    }

    /**
     * Mails $user a signed link to the current panel's verification route,
     * valid for `auth.verification.expire` minutes (default 60). False when the
     * panel serves no subclass, so callers need not check first.
     */
    public static function sendVerificationLink(Authenticatable&MustVerifyEmail $user): bool
    {
        $route = static::routeName();
        if ($route === null) {
            return false;
        }
        $url = URL::temporarySignedRoute(
            $route.'.verify',
            Carbon::now()->addMinutes((int) Config::get('auth.verification.expire', 60)),
            ['id' => $user->getAuthIdentifier(), 'hash' => sha1($user->getEmailForVerification())],
        );
        Notification::send($user, new VerifyEmailNotification($url));

        return true;
    }

    public function title(): string
    {
        return __('tbtop-admin::admin.auth.verify.title');
    }

    public function layout(): string
    {
        return 'center';
    }

    public function view(S $s): Node
    {
        $user = $this->user();
        if (! $user instanceof MustVerifyEmail || $user->hasVerifiedEmail()) {
            return $s->stack([
                $s->displayText(__('tbtop-admin::admin.auth.verify.verified'))->variant('heading'),
                $s->actionsRow([
                    $s->action('continue')->label(__('tbtop-admin::admin.auth.verify.continue'))->color('primary')->url(static::panel()->pathPrefix()),
                ]),
            ]);
        }
        $profileUrl = ProfilePage::currentUrl();

        return $s->stack([
            $s->displayText(__('tbtop-admin::admin.auth.verify.title'))->variant('heading'),
            $s->displayText(__('tbtop-admin::admin.auth.verify.prompt', ['email' => $user->getEmailForVerification()])),
            $s->actionsRow([
                $s->action('send')->label(__('tbtop-admin::admin.auth.verify.send'))->color('primary')
                    ->handle(fn (ActionCtx $ctx): Effects => $this->resend($ctx)),
                ...($profileUrl === null ? [] : [
                    $s->action('profile')->label(__('tbtop-admin::admin.auth.profile.title'))->url($profileUrl)->link(),
                ]),
                $s->action('logout')->label(__('tbtop-admin::admin.auth.verify.logout'))->link()
                    ->handle(fn (ActionCtx $ctx): Effects => $this->logout($ctx)),
            ]),
        ]);
    }

    /** Link requests allowed per user per minute. */
    protected function maxAttempts(): int
    {
        return 6;
    }

    /** Throttled per user: the mail goes to the user's own address, so the limit guards the mailer, not secrecy. */
    protected function resend(ActionCtx $ctx): Effects
    {
        $user = $this->user();
        if (! $user instanceof MustVerifyEmail || $user->hasVerifiedEmail()) {
            return Effects::make()->redirect(static::panel()->pathPrefix());
        }

        $key = 'tbtop-verify|'.$user::class.'|'.$user->getAuthIdentifier();
        if (RateLimiter::tooManyAttempts($key, $this->maxAttempts())) {
            $seconds = RateLimiter::availableIn($key);

            return Effects::make()->notify(__('tbtop-admin::admin.auth.verify.throttle', ['seconds' => $seconds]), 'error');
        }
        RateLimiter::hit($key);
        static::sendVerificationLink($user);

        return Effects::make()->notify(__('tbtop-admin::admin.auth.verify.sent'));
    }

    /** The page is chrome-less, so it carries its own way out (the user menu's logout is not on screen). */
    protected function logout(ActionCtx $ctx): Effects
    {
        Auth::guard(static::panel()->guard())->logout();
        $ctx->request->session()->invalidate();
        $ctx->request->session()->regenerateToken();

        return Effects::make()->redirect(static::panel()->pathPrefix());
    }

    /** The panel guard's user; the page sits behind auth:{guard}, so there always is one. */
    protected function user(): Authenticatable
    {
        return Auth::guard(static::panel()->guard())->user()
            ?? throw new LogicException('EmailVerificationPage served without a signed-in user.');
    }
}
