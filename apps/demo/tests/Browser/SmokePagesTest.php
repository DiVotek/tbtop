<?php

declare(strict_types=1);

use App\Models\Brand;
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
    // Spatie-translatable name: proves ->translatable() flattens the locale map
    // to a string instead of leaking it as [object Object] in the rendered cell.
    Brand::create(['name' => ['en' => 'Brand', 'uk' => 'Марка'], 'slug' => 'smoke-brand']);
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
    '/admin/brands',
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

it('renders a Spatie-translatable column as a flat string, not the locale map', function () {
    visit('/admin/brands')
        ->assertVisible('#app main')
        ->assertSee('Brand')              // flattened locale value
        ->assertDontSee('[object Object]') // the bug symptom
        ->assertNoSmoke();
});
