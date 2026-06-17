<?php

declare(strict_types=1);

use App\Models\User;

// Shallow browser smoke for the public auth pages authored as DSL pages inside
// the panel (LoginPage, TwoFactorChallengePage). Unlike SmokePagesTest, these
// must render while LOGGED OUT — they override the panel middleware to ['web'],
// skipping auth:guard and RequireFullAuth. We assert the Inertia root mounts a
// form (center layout has no admin <main> shell) with no console errors, and
// that a guarded page still redirects an anonymous visitor to login.

it('smokes the public login page while logged out', function () {
    // No actingAs: the login page must be reachable anonymously.
    visit('/admin/login')
        ->assertVisible('#app form')   // login form hydrated on the center layout
        ->assertNoSmoke();             // no console logs + no JavaScript errors
});

it('redirects a guarded admin page to the admin login when logged out', function () {
    visit('/admin/dashboard')
        ->assertPathIs('/admin/login'); // RequireFullAuth → admin DSL login, not legacy /login
});

it('still renders a guarded admin page when authenticated', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin);

    visit('/admin/dashboard')
        ->assertVisible('#app main')
        ->assertNoSmoke();
});
