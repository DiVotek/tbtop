<?php

declare(strict_types=1);

use App\Models\Post;
use App\Models\User;

// Browser smoke for the ->softDeletes() macro on the dedicated demo page: the
// Active tab hides trashed rows, the Trashed tab surfaces them, and the Restore
// row action moves a row back to Active. Tab switching + row-action dispatch are
// not reproducible in happy-dom (portalled menu + live table refetch).

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
});

it('hides trashed rows on Active, shows them on Trashed, and restores back', function () {
    Post::factory()->create([
        'title' => ['en' => 'Visible Post'],
        'slug' => 'visible-post',
        'published' => true,
    ]);
    $trashed = Post::factory()->create([
        'title' => ['en' => 'Trashed Post'],
        'slug' => 'trashed-post',
        'published' => false,
    ]);
    $trashed->delete();

    $page = visit('/admin/soft-deletes');

    // Active tab (default) lists live rows only.
    $page->assertVisible('@table-block')
        ->assertSee('Visible Post')
        ->assertDontSee('Trashed Post');

    // Trashed tab surfaces the soft-deleted row.
    $page->click('@tab-Trashed')
        ->assertSee('Trashed Post')
        ->assertNoJavaScriptErrors();

    // Restore moves it back; it leaves the Trashed tab.
    $page->click('@row-actions-trigger')
        ->click('@action-restore')
        ->assertDontSee('Trashed Post')
        ->assertNoJavaScriptErrors();
});
