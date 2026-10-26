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

it('answers an unknown email on the reset form exactly like a bad token', function () {
    $this->from('/admin/reset-password/bogus')->post('/admin/reset-password/bogus/forms/reset', [
        'email' => 'nobody@example.com',
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])->assertSessionHasErrors(['email' => __('passwords.token')]);
});

it('throttles failed resets per IP so emails cannot be probed in bulk', function () {
    $attempt = fn (string $email) => $this->from('/admin/reset-password/bogus')->post('/admin/reset-password/bogus/forms/reset', [
        'email' => $email,
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ]);
    foreach (range(1, 5) as $i) {
        $attempt("probe{$i}@example.com")->assertSessionHasErrors(['email' => __('passwords.token')]);
    }

    $attempt('olena@example.com')->assertSessionHasErrors('email');
    expect(session('errors')->first('email'))->toStartWith('Too many password reset attempts');
});

it('throttles reset link requests per IP with its own message', function () {
    foreach (range(1, 5) as $i) {
        requestLink("probe{$i}@example.com");
    }

    requestLink('olena@example.com')->assertSessionHasErrors('email');
    expect(session('errors')->first('email'))->toStartWith('Too many reset link requests');
});

it('answers array input on the forgot and reset forms with a validation error, not a 500', function () {
    $this->from('/admin/forgot-password')->post('/admin/forgot-password/forms/forgot', ['email' => ['x']])
        ->assertRedirect('/admin/forgot-password')
        ->assertSessionHasErrors('email');

    $this->from('/admin/reset-password/bogus')->post('/admin/reset-password/bogus/forms/reset', [
        'email' => 'olena@example.com',
        'password' => ['brand-new-password'],
        'password_confirmation' => ['brand-new-password'],
    ])->assertRedirect('/admin/reset-password/bogus')->assertSessionHasErrors('password');
});

function signInAs(string $password): void
{
    test()->from('/admin/login')->post('/admin/login/forms/login', ['email' => 'olena@example.com', 'password' => $password])
        ->assertSessionHasNoErrors();
}

/** The test client keeps one session store: swap in another browser's data and drop the guard's cached user. */
function switchSession(array $data): void
{
    session()->flush();
    session()->put($data);
    app('auth')->forgetGuards();
}

function completeReset(string $password): void
{
    requestLink('olena@example.com');
    $token = null;
    Notification::assertSentTo(test()->user, ResetPasswordNotification::class, function ($n) use (&$token): bool {
        $token = $n->token;

        return true;
    });
    test()->post("/admin/reset-password/{$token}/forms/reset", [
        'email' => 'olena@example.com',
        'password' => $password,
        'password_confirmation' => $password,
    ])->assertSessionHasNoErrors();
}

it('signs out a session elsewhere on its next request once the password is reset', function () {
    signInAs('old-password');
    $this->get('/admin/nav-demo')->assertOk();
    $elsewhere = session()->all();

    switchSession([]);
    completeReset('brand-new-password');
    signInAs('brand-new-password');
    $this->get('/admin/nav-demo')->assertOk();
    $resetter = session()->all();

    switchSession($elsewhere);
    $this->get('/admin/nav-demo')->assertRedirect('/admin/login');
    $this->assertGuest('staff');

    switchSession($resetter);
    $this->get('/admin/nav-demo')->assertOk();
});

it('keeps a signed-in session whose password did not change', function () {
    signInAs('old-password');

    $this->get('/admin/nav-demo')->assertOk();
    $this->get('/admin/nav-demo')->assertOk();
    $this->assertAuthenticatedAs($this->user, 'staff');
});

it('renders the reset page when the email query param is an array', function () {
    $this->get('/admin/reset-password/some-token?email[]=x', ['X-Inertia' => 'true'])->assertOk();
});
