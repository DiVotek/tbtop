<?php

declare(strict_types=1);

use App\Models\Post;
use App\Models\User;

// The posts table's computed "Status" column uses the inline badge map:
// a mapped value shows its label in its color — a client paint, browser-only.

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
});

it('renders the status badge label in its color', function () {
    Post::factory()->create([
        'title' => ['en' => 'Badge post'],
        'slug' => 'badge-post',
        'published' => true,
        'published_at' => '2026-03-01 08:00:00',
    ]);

    $page = visit('/admin/posts')->assertSee('Live');

    $painted = $page->script(<<<'JS'
Array.from(document.querySelectorAll('#app main td *'))
  .some((el) => el.textContent?.trim() === 'Live' && el.className.includes('bg-success'))
JS);

    expect($painted)->toBeTrue();
    $page->assertNoSmoke();
});
