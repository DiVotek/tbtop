<?php

declare(strict_types=1);

use App\Models\Post;
use App\Models\User;

it('updates the open form when unpublishing and keeps the post unpublished on save', function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $post = Post::factory()->create([
        'slug' => 'unpublish-post',
        'published' => true,
        'published_at' => '2026-03-01 08:00:00',
        'sections' => [],
    ]);

    $page = visit("/admin/posts/{$post->id}/edit")
        ->assertAttribute('[role="switch"]', 'aria-checked', 'true')
        ->click('@action-unpublish')
        ->assertSee('Post unpublished');

    expect($post->fresh()->published)->toBeFalse();
    expect($post->fresh()->published_at)->toBeNull();

    $page->assertAttribute('[role="switch"]', 'aria-checked', 'false')
        ->click('Save')
        ->assertSee('Saved')
        ->assertNoJavaScriptErrors();

    expect($post->fresh()->published)->toBeFalse();
    expect($post->fresh()->published_at)->toBeNull();
});

it('unpublishes without validating or discarding unrelated unsaved fields', function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $post = Post::factory()->create(['published' => true, 'published_at' => now()]);

    visit("/admin/posts/{$post->id}/edit")
        ->click('[data-field="slug"] button[aria-label="Clear"]')
        ->click('@action-unpublish')
        ->assertSee('Post unpublished')
        ->assertAttribute('[role="switch"]', 'aria-checked', 'false')
        ->assertValue('#slug', '')
        ->assertNoJavaScriptErrors();

    expect($post->fresh()->published)->toBeFalse();
    expect($post->fresh()->slug)->toBe($post->slug);
});
