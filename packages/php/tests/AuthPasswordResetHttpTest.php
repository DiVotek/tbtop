<?php

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Auth\ResetPasswordNotification;
use Tbtop\Admin\Tests\Fixtures\Auth\AuthUser;

beforeEach(function () {
    Notification::fake();
    $this->user = AuthUser::create([
        'name' => 'Olena',
        'email' => 'olena@example.com',
        'password' => Hash::make('old-password'),
        'remember_token' => 'old-remember-token',
    ]);
});

function requestLink(string $email): TestResponse
{
    return test()->from('/admin/forgot-password')->post('/admin/forgot-password/forms/forgot', ['email' => $email]);
}

function flashedEffects(string $url): mixed
{
    return test()->get($url, ['X-Inertia' => 'true'])->json('flash')['tbtop.effects'] ?? null;
}

it('mails a link to the panel reset page, not to a host route', function () {
    requestLink('olena@example.com')->assertRedirect('/admin/forgot-password');

    Notification::assertSentTo($this->user, ResetPasswordNotification::class, function (ResetPasswordNotification $n): bool {
        return str_starts_with($n->url, 'http://localhost/admin/reset-password/'.$n->token.'?email=olena%40example.com');
    });
});

it('answers an unknown email exactly like a known one', function () {
    $sent = [['kind' => 'notify', 'message' => 'If that email is registered, a reset link is on its way.', 'level' => 'success'], ['kind' => 'resetForm']];

    requestLink('nobody@example.com')->assertSessionHasNoErrors();
    expect(flashedEffects('/admin/forgot-password'))->toBe($sent);

    requestLink('olena@example.com')->assertSessionHasNoErrors();
    expect(flashedEffects('/admin/forgot-password'))->toBe($sent);

    // The broker's own per-account throttle must not show through either.
    requestLink('olena@example.com')->assertSessionHasNoErrors();
    expect(flashedEffects('/admin/forgot-password'))->toBe($sent);
});

it('sets the new password, rotates the remember token and sends the user to sign in', function () {
    requestLink('olena@example.com');
    $token = null;
    Notification::assertSentTo($this->user, ResetPasswordNotification::class, function ($n) use (&$token): bool {
        $token = $n->token;

        return true;
    });
    $page = "/admin/reset-password/{$token}";

    $this->from($page)->post("{$page}/forms/reset", [
        'email' => 'olena@example.com',
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])->assertSessionHasNoErrors();

    expect(flashedEffects($page))->toBe([
        ['kind' => 'notify', 'message' => __('passwords.reset'), 'level' => 'success'],
        ['kind' => 'redirect', 'href' => '/admin/login'],
    ]);
    $fresh = $this->user->fresh();
    expect(Hash::check('brand-new-password', $fresh->password))->toBeTrue()
        ->and($fresh->remember_token)->not->toBe('old-remember-token');
});

it('refuses an invalid token under the email field', function () {
    $this->from('/admin/reset-password/bogus')->post('/admin/reset-password/bogus/forms/reset', [
        'email' => 'olena@example.com',
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])->assertSessionHasErrors(['email' => __('passwords.token')]);

    expect(Hash::check('old-password', $this->user->fresh()->password))->toBeTrue();
});
