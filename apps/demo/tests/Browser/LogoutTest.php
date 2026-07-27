<?php

declare(strict_types=1);

use App\Models\User;

// Browser smoke for the logout click-path through the admin shell's profile
// dropdown: open the user menu, click sign-out, land back on the login page.
// Session invalidation itself is covered at the HTTP boundary in
// AuthenticationTest::test_users_can_logout — this only proves the UI path
// (trigger -> menu -> logout button -> redirect) is wired end to end.

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
});

it('logs out via the profile dropdown and redirects to login', function () {
    visit('/admin/dashboard')
        ->assertVisible('@profile-trigger')
        ->click('@profile-trigger')
        ->assertVisible('@profile-menu')
        ->click('@profile-logout')
        ->assertPathIs('/admin/login')
        ->assertNoJavaScriptErrors();
});
