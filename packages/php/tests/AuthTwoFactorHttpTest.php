<?php

use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Tests\Fixtures\Auth\AuthUser;
use Tbtop\Admin\Tests\Fixtures\Auth\LoginPage;

/**
 * Sign-in on a panel that serves the published TwoFactorChallengePage: the
 * password alone signs in only users without a second factor.
 */
beforeEach(function () {
    $this->secret = 'JBSWY3DPEHPK3PXP';
    $this->user = $this->enableTwoFactor(
        AuthUser::create(['name' => 'Olena', 'email' => 'olena@example.com', 'password' => Hash::make('secret-pass')]),
        $this->secret,
    );
    $this->plain = AuthUser::create(['name' => 'Taras', 'email' => 'taras@example.com', 'password' => Hash::make('secret-pass')]);
});

afterEach(function () {
    LoginPage::$afterAuthenticated = null;
});

function login(string $email = 'olena@example.com', bool $remember = false): TestResponse
{
    return test()->from('/admin/login')->post('/admin/login/forms/login', ['email' => $email, 'password' => 'secret-pass', 'remember' => $remember]);
}

function answer(string $code): TestResponse
{
    return test()->from('/admin/two-factor-challenge')->post('/admin/two-factor-challenge/forms/challenge', ['code' => $code]);
}

it('parks a user with a second factor at the challenge instead of signing them in', function () {
    Event::fake([Login::class]);

    login()->assertRedirect('/admin/two-factor-challenge');

    $this->assertGuest('staff');
    Event::assertNotDispatched(Login::class);
    $this->get('/admin/two-factor-challenge')->assertOk();
});

it('signs a user without a second factor straight in, remember cookie included', function () {
    Event::fake([Login::class]);

    login('taras@example.com', remember: true)->assertRedirect('/admin')->assertCookie(auth()->guard('staff')->getRecallerName());

    $this->assertAuthenticatedAs($this->plain, 'staff');
    Event::assertDispatched(Login::class);
});

it('fires Failed once for a wrong password, as attempt() does', function () {
    Event::fake([Failed::class]);

    test()->from('/admin/login')->post('/admin/login/forms/login', ['email' => 'olena@example.com', 'password' => 'wrong'])
        ->assertSessionHasErrors(['email' => __('auth.failed')]);

    Event::assertDispatchedTimes(Failed::class, 1);
    Event::assertDispatched(Failed::class, fn (Failed $event): bool => $event->guard === 'staff' && $event->user?->is($this->user));
});

it('signs in with the authenticator code and returns to the intended page', function () {
    $this->get('/admin/nav-demo')->assertRedirect('/admin/login');
    login();
    $before = session()->getId();

    answer($this->totp($this->secret))->assertRedirect('/admin/nav-demo');

    $this->assertAuthenticatedAs($this->user, 'staff');
    expect(session()->getId())->not->toBe($before);
    $this->get('/admin/nav-demo')->assertOk();
});

it('runs the login page\'s afterAuthenticated() once the code passes, and follows its URL', function () {
    $seen = [];
    LoginPage::$afterAuthenticated = function ($user) use (&$seen): string {
        $seen[] = [$user->getKey(), auth()->guard('staff')->check()];

        return '/admin/onboarding';
    };

    login()->assertRedirect('/admin/two-factor-challenge');
    expect($seen)->toBe([]);

    answer($this->totp($this->secret))->assertRedirect('/admin/onboarding');
    expect($seen)->toBe([[$this->user->getKey(), true]]);
});

it('keeps the remember choice from the password step', function () {
    login(remember: true);

    answer($this->totp($this->secret))->assertCookie(auth()->guard('staff')->getRecallerName());
});

it('refuses a code that already signed in once', function () {
    login();
    $code = $this->totp($this->secret);
    answer($code);
    $this->post('/admin/logout');

    login();
    answer($code)->assertSessionHasErrors(['code' => 'Invalid code.']);

    $this->assertGuest('staff');
});

it('accepts each recovery code once', function () {
    login();
    answer('first-code')->assertRedirect('/admin');
    $this->post('/admin/logout');

    login();
    answer('first-code')->assertSessionHasErrors('code');
    answer('second-code')->assertRedirect('/admin');
});

it('drops the parked sign-in after five wrong codes', function () {
    login();
    foreach (range(1, 5) as $_) {
        answer('000000');
    }

    answer($this->totp($this->secret))->assertRedirect('/admin/login');

    $this->assertGuest('staff');
});

it('drops a parked sign-in after ten minutes', function () {
    login();
    $this->travel(11)->minutes();

    answer($this->totp($this->secret))->assertRedirect('/admin/login');
    $this->assertGuest('staff');
});

it('drops a parked sign-in once the password changes elsewhere', function () {
    login();
    $this->user->forceFill(['password' => Hash::make('reset-elsewhere')])->save();

    answer($this->totp($this->secret))->assertRedirect('/admin/login');
    $this->assertGuest('staff');
});

it('drops a parked sign-in when another account signs in with its password', function () {
    login();
    login('taras@example.com');

    $this->get('/admin/two-factor-challenge')->assertRedirect('/admin/login');
    $this->assertAuthenticatedAs($this->plain, 'staff');
});

it('sends anyone who owes no code from the challenge to the login', function () {
    $this->get('/admin/two-factor-challenge')->assertRedirect('/admin/login');
    answer('000000')->assertRedirect('/admin/login');
});

it('challenges a session a remember cookie restored, instead of looping', function () {
    $this->actingAs($this->user, 'staff');

    $this->get('/admin/nav-demo')->assertRedirect('/admin/two-factor-challenge');
    $this->get('/admin/two-factor-challenge')->assertOk();
    answer($this->totp($this->secret))->assertRedirect('/admin/nav-demo');

    $this->get('/admin/nav-demo')->assertOk();
});

it('does not let one account\'s pass cover another', function () {
    $other = $this->enableTwoFactor(AuthUser::create(['name' => 'Ira', 'email' => 'ira@example.com', 'password' => Hash::make('x')]), $this->secret);

    $this->actingAs($this->user, 'staff')->withSession(['tbtop_two_factor.passed.staff' => AuthUser::class.'|'.$other->getKey()])
        ->get('/admin/nav-demo')->assertRedirect('/admin/two-factor-challenge');
});

it('answers a JSON request of an unpassed session with 403', function () {
    $this->actingAs($this->user, 'staff')->getJson('/admin/nav-demo')->assertForbidden();
});

it('lets an unpassed session sign out', function () {
    $this->actingAs($this->user, 'staff')->post('/admin/logout')->assertRedirect('/admin');

    $this->assertGuest('staff');
});
