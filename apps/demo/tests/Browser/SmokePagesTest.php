<?php

declare(strict_types=1);

use App\Models\Post;
use App\Models\User;

// Shallow browser smoke for the admin pages: each renders the real React app over
// Inertia, so we assert the Inertia root mounts and there are no JS/console errors.
// Deeper behaviour belongs in Feature tests; this layer only catches dead bundles,
// hydration crashes, and console noise that happy-dom can't see.

beforeEach(function () {
    // The admin gate requires role=admin; the factory does not set it. Seed inside
    // the test because RefreshDatabase wipes DatabaseSeeder's admin.
    $this->admin = User::factory()->create(['role' => 'admin']);
    $this->post = Post::factory()->create(); // representative id for /posts/{id}/edit
    $this->actingAs($this->admin);
});

it('smokes admin page', function (string $path) {
    // `#app main` is an explicit CSS selector (a bare `main` would be read as the text
    // "main"). The <main> lives inside the React-mounted admin shell, so its visibility
    // proves the page hydrated real content, not just the server-rendered #app root.
    visit($path)
        ->assertVisible('#app main')   // React-rendered admin shell content
        ->assertNoSmoke();             // no console logs + no JavaScript errors
})->with([
    '/admin/dashboard',
    '/admin/playground',
    '/admin/validation-rules',
    '/admin/posts',
    '/admin/posts/new',
    '/admin/relation-demo',
    '/admin/upload-demo',
    '/admin/media',
    '/admin/media/new',
    '/admin/settings',
]);

it('smokes the post edit page', function () {
    visit("/admin/posts/{$this->post->id}/edit")
        ->assertVisible('#app main')
        ->assertNoSmoke();
});
