<?php

declare(strict_types=1);

use App\Models\Post;
use App\Models\User;

// Browser-only checks for the modal data query (#2) + conditional row action (#3):
// the "Publication" row action is hidden on draft posts and, on a published post,
// opens a portalled modal prefilled per row — neither is reproducible in happy-dom.

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
});

it('shows the Publication action only on published posts and opens a prefilled modal', function () {
    Post::factory()->create([
        'title' => ['en' => 'Published one'],
        'slug' => 'published-one',
        'published' => true,
        'published_at' => '2026-03-01 08:00:00',
    ]);

    $page = visit('/admin/posts');

    // Three visible row actions (edit, editPublication, delete) exceed the inline
    // max, so they collapse into the overflow menu — open it to reach the action.
    $page->assertVisible('@row-actions-trigger')
        ->click('@row-actions-trigger')
        ->click('@action-editPublication')
        ->assertVisible('@modal-editPublication')
        ->assertVisible('@form-block')
        ->assertNoJavaScriptErrors();
});

it('hides the Publication action on a draft post', function () {
    Post::factory()->create([
        'title' => ['en' => 'Draft one'],
        'slug' => 'draft-one',
        'published' => false,
        'published_at' => null,
    ]);

    visit('/admin/posts')
        ->assertVisible('#app main')
        ->assertDontSee('Publication')
        ->assertNoJavaScriptErrors();
});
