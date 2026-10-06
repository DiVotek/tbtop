<?php

declare(strict_types=1);

use App\Models\User;

// Browser smoke for the public auth pages: the scaffolded LoginPage /
// ForgotPasswordPage (app/Admin/Pages/Auth, from `admin:install --auth`) and the
// demo's TwoFactorChallengePage. Unlike SmokePagesTest, these must render while
// LOGGED OUT — they skip the panel's auth guard and RequireFullAuth. We assert the
// Inertia root mounts a form (center layout has no admin <main> shell) with no
// console errors, and that a guarded page sends an anonymous visitor to login.

it('smokes the public login page while logged out', function () {
    // No actingAs: the login page must be reachable anonymously.
    visit('/admin/login')
        ->assertVisible('#app form')   // login form hydrated on the center layout
        ->assertNoSmoke();             // no console logs + no JavaScript errors
});

it('links the login page to the forgot-password page', function () {
    visit('/admin/login')
        ->click('Forgot your password?')
        ->assertPathIs('/admin/forgot-password')
        ->assertVisible('#app form')
        ->assertNoSmoke();
});

it('signs a bounced guest in and returns them to the page they asked for', function () {
    User::factory()->create([
        'email' => 'admin@admin.com',
        'password' => 'password',
        'role' => 'admin',
    ]);

    visit('/admin/posts')
        ->assertPathIs('/admin/login')
        ->type('email', 'admin@admin.com')
        ->type('password', 'password')
        ->click('button[type="submit"]')
        ->assertPathIs('/admin/posts')
        ->assertVisible('#app main')
        ->assertNoJavaScriptErrors();
});

it('renders a code field on the public two-factor challenge page', function () {
    // The challenge page is public (middleware ['web']); the session check
    // only fires on submit. A direct visit must render the code field — a
    // text input so both a 6-digit TOTP and a recovery code can be entered.
    visit('/admin/two-factor-challenge')
        ->assertVisible('#app form')
        ->assertVisible('code')
        ->assertNoSmoke();
});

it('redirects a guarded admin page to the admin login when logged out', function () {
    visit('/admin/dashboard')
        ->assertPathIs('/admin/login');
});

it('still renders a guarded admin page when authenticated', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin);

    visit('/admin/dashboard')
        ->assertVisible('#app main')
        ->assertNoSmoke();
});
