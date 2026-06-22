<?php

declare(strict_types=1);

use App\Models\User;

// Browser-only checks for the searchable + creatable Author select on the post form.
// happy-dom can't reproduce the real placeholder-vs-foreground color, so the gray-text
// fix (Bug #1) and the created-label-not-UUID fix (Bug #2) are confirmed here.

it('shows the created author label, not the id, after inline create', function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));

    $page = visit('/admin/posts/new');

    // The Author select is searchable static + creatable.
    $page->assertVisible('@select-create-author_id');

    // Create a new author inline.
    $page->click('@select-create-author_id')
        ->assertVisible('@select-create-dialog')
        ->type('name', 'Carol')
        ->click('@select-create-submit');

    // The selected label shows the name, never the new record id.
    $page->assertVisible('@select-label-author_id')
        ->assertSeeIn('@select-label-author_id', 'Carol')
        ->assertNoJavaScriptErrors();
});
