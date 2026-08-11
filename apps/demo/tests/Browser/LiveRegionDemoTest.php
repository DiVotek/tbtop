<?php

declare(strict_types=1);

use App\Models\City;
use App\Models\Country;
use App\Models\User;

// Proves the whole live-region loop in a real browser: picking a user posts the
// current deps to the live-region endpoint and the server-rendered card replaces
// the placeholder without a page reload.

it('reloads the user card when the selection changes', function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $country = Country::create(['name' => 'Ukraine']);
    $city = City::create(['country_id' => $country->id, 'name' => 'Kyiv']);
    User::factory()->create([
        'name' => 'Olena',
        'email' => 'olena@example.test',
        'role' => 'user',
        'city_id' => $city->id,
    ]);

    $page = visit('/admin/live-region-demo');

    // Initial server render: nothing selected yet.
    $page->assertSee('Pick a user to see their card.');

    $page->click('user_id')
        ->click("[role='option']:has-text('Olena')")
        ->assertSee('olena@example.test')
        ->assertSee('Kyiv')
        ->assertDontSee('Pick a user to see their card.')
        ->assertNoJavaScriptErrors();
});
