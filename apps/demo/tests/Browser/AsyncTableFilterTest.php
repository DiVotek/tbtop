<?php

declare(strict_types=1);

use App\Models\Post;
use App\Models\User;

it('loads and applies an async Select table filter', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $targetAuthor = User::factory()->create(['email' => 'filter.target@example.test']);
    $otherAuthor = User::factory()->create(['email' => 'filter.other@example.test']);
    Post::factory()->create([
        'title' => ['en' => 'Scoped filter target', 'uk' => 'Scoped filter target'],
        'author_id' => $targetAuthor->id,
    ]);
    Post::factory()->create([
        'title' => ['en' => 'Scoped filter other', 'uk' => 'Scoped filter other'],
        'author_id' => $otherAuthor->id,
    ]);
    $this->actingAs($admin);

    $page = visit('/admin/posts')
        ->click('@table-filters-trigger')
        ->assertVisible('@select-search-author_id')
        ->type('author_id', 'filter.target')
        ->assertSee('filter.target@example.test');

    $page->script(<<<'JS'
Array.from(document.querySelectorAll('[role="option"]'))
  .find((option) => option.textContent?.includes('filter.target@example.test'))
  ?.click()
JS);

    $page->assertSeeIn('@select-label-author_id', 'filter.target@example.test')
        ->click('Done')
        ->assertSee('Scoped filter target')
        ->assertDontSee('Scoped filter other')
        ->assertNoSmoke();
});
