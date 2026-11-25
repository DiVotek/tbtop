<?php

use App\Models\Post;
use App\Models\User;

it('returns a publication-only form patch even with no form data', function (bool $published) {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $post = Post::factory()->create(['published' => $published, 'published_at' => now()]);

    $this->postJson("/admin/posts/{$post->id}/edit/actions/unpublish", ['payload' => ['form' => []]])
        ->assertOk()
        ->assertJsonPath('effects', [
            ['kind' => 'notify', 'message' => 'Post unpublished', 'level' => 'success'],
            ['kind' => 'setFormData', 'data' => ['published' => false, 'published_at' => null]],
        ]);

    expect($post->fresh()->published)->toBeFalse();
    expect($post->fresh()->published_at)->toBeNull();
})->with([true, false]);

it('requires authentication to unpublish', function () {
    $post = Post::factory()->create(['published' => true]);

    $this->postJson("/admin/posts/{$post->id}/edit/actions/unpublish", ['payload' => []])
        ->assertUnauthorized();

    expect($post->fresh()->published)->toBeTrue();
});
