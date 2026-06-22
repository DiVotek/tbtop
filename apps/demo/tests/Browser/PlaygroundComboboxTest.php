<?php

declare(strict_types=1);

use App\Models\User;

// Browser-only checks that happy-dom can't reproduce: the Base UI combobox opens a
// portalled popup, and the inline "create" dialog must stack above it (z-50). Plus one
// real /login form drive, replacing the old Playwright auth.setup.ts.

it('opens, selects, and creates in the roles combobox', function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));

    $page = visit('/admin/playground');

    // The roles multi-select renders pre-seeded with the "admin" chip.
    $page->assertVisible('@chip-admin');

    // Popup opens on focus and shows option rows; selecting adds a chip. The combobox
    // input has id="roles" (the field name); `roles` resolves to that input.
    $page->click('roles')
        ->click('Editor')
        ->assertVisible('@chip-editor');

    // Typing a non-match into the input surfaces the inline "Create" row.
    $page->click('roles')
        ->type('roles', 'Auditor')
        ->assertVisible('@select-create-roles');

    // Opening create shows the dialog ABOVE the popup (z-50 stacking).
    $page->click('@select-create-roles')
        ->assertVisible('@select-create-dialog');

    // Completing create adds a chip showing the label ("Auditor"), not the
    // lowercased value ("auditor") — static multi must resolve created labels.
    // Exact, case-sensitive text check: getByText is case-insensitive and would
    // let "auditor" pass, so read the chip's own label span via script.
    $page->type('label', 'Auditor')
        ->click('@select-create-submit')
        ->assertVisible('@chip-auditor')
        ->assertScript(
            "document.querySelector('[data-testid=\"chip-auditor\"] span')?.textContent?.trim()",
            'Auditor',
        )
        ->assertNoJavaScriptErrors();
});

it('logs in through the real login form', function () {
    User::factory()->create([
        'email' => 'admin@admin.com',
        'password' => 'password',
        'role' => 'admin',
    ]);

    visit('/login')
        ->type('email', 'admin@admin.com')
        ->type('password', 'password')
        ->click('Log in')
        ->assertPathIsNot('/login')
        ->assertNoJavaScriptErrors();
});
