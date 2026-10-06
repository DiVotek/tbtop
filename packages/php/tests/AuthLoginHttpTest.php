<?php

use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Tests\Fixtures\Auth\AuthUser;

/**
 * The published LoginPage on a panel whose guard is not the app default:
 * every assertion about who is signed in names the 'staff' guard.
 */
beforeEach(function () {
    $this->user = AuthUser::create(['name' => 'Olena', 'email' => 'olena@example.com', 'password' => Hash::make('secret-pass')]);
});

function signIn(array $form): TestResponse
{
    return test()->from('/admin/login')->post('/admin/login/forms/login', $form);
}

it('sends a guest from a panel page to the panel login', function () {
    $this->get('/admin/nav-demo')->assertRedirect('/admin/login');
    $this->get('/admin/login')->assertOk();
});

it('never makes an auth page the panel home', function () {
    $this->actingAs($this->user, 'staff')->get('/admin')->assertRedirect('/admin/nav-demo');
});

it('rejects a wrong password under the email field', function () {
    signIn(['email' => 'olena@example.com', 'password' => 'wrong'])
        ->assertRedirect('/admin/login')
        ->assertSessionHasErrors(['email' => __('auth.failed')]);

    $this->assertGuest('staff');
});

it('locks the email out after five failures, even for the right password', function () {
    foreach (range(1, 5) as $_) {
        signIn(['email' => 'olena@example.com', 'password' => 'wrong']);
    }

    signIn(['email' => 'olena@example.com', 'password' => 'secret-pass'])
        ->assertSessionHasErrors('email');

    expect(session('errors')->first('email'))->toStartWith('Too many login attempts');
    $this->assertGuest('staff');
});

it('signs in on the panel guard, renews the session and returns to the intended page', function () {
    $this->get('/admin/nav-demo');
    $before = session()->getId();

    signIn(['email' => 'olena@example.com', 'password' => 'secret-pass'])
        ->assertRedirect('/admin/nav-demo');

    $this->assertAuthenticatedAs($this->user, 'staff');
    $this->assertGuest('web');
    expect(session()->getId())->not->toBe($before);
});

it('lands on the panel root without an intended page', function () {
    signIn(['email' => 'olena@example.com', 'password' => 'secret-pass'])
        ->assertRedirect('/admin');
});

it('sends a signed-in user away from the auth pages', function () {
    $this->actingAs($this->user, 'staff');

    $this->get('/admin/login')->assertRedirect('/admin');
    $this->get('/admin/forgot-password')->assertRedirect('/admin');
});
