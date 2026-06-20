<?php

declare(strict_types=1);

use App\Models\User;

// Browser smoke for the M-96 read-only display primitives. happy-dom can't
// render Lexical (the richtext view) and the cell helpers are visual, so the
// real check that the displayValue badge/boolean/icon/money/date, full-size
// image, and rendered richtext all paint lives here, in a real browser.

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
});

it('renders every display primitive on the record detail page', function () {
    $page = visit('/admin/record-detail');

    $page->assertVisible('#app main')          // admin shell hydrated
        ->assertSee('Order #1042')             // displayText heading
        ->assertSee('paid')                    // displayValue badge value
        ->assertSee('49.99 USD')               // displayValue money (4999 cents, pre-formatted)
        ->assertSee('2024-03-15')              // displayValue date (pre-formatted)
        ->assertSee('TT-1042')                 // displayKeyValue dd value
        ->assertSee('Handle with care')        // displayRichtext rendered text
        ->assertVisible('main img')            // displayImage full-size image
        ->assertNoSmoke();                     // no console logs + no JS errors
});
