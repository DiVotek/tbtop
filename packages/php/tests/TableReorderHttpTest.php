<?php

use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\Fixtures\EcPost;
use Tbtop\Admin\Tests\ReorderHttpTestCase;

uses(ReorderHttpTestCase::class);

beforeEach(function (): void {
    Schema::create('ecposts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->boolean('published')->default(false);
        $table->string('note')->default('');
        $table->string('status')->default('draft');
        $table->unsignedInteger('sort_order')->default(0);
    });
    // Seed in a known starting order: a=0, b=1, c=2.
    EcPost::create(['title' => 'a', 'published' => true, 'sort_order' => 0]);
    EcPost::create(['title' => 'b', 'published' => true, 'sort_order' => 1]);
    EcPost::create(['title' => 'c', 'published' => false, 'sort_order' => 2]);
});

function reorderIdsByTitle(array $titles): array
{
    return array_map(fn (string $t) => EcPost::where('title', $t)->value('id'), $titles);
}

// ---------------------------------------------------------------------------
// Happy path — sort_order rewritten to index order, refreshTable effect
// ---------------------------------------------------------------------------

it('Reorder: happy path writes sort_order to index order and returns refreshTable', function (): void {
    $ids = reorderIdsByTitle(['c', 'a', 'b']);

    $response = $this->postJson('/admin/reorder-posts/tables/ecposts/reorder', ['ids' => $ids]);

    $response->assertOk();
    expect($response->json('effects'))->toContain(['kind' => 'refreshTable', 'table' => 'ecposts']);
    expect(EcPost::where('title', 'c')->value('sort_order'))->toBe(0);
    expect(EcPost::where('title', 'a')->value('sort_order'))->toBe(1);
    expect(EcPost::where('title', 'b')->value('sort_order'))->toBe(2);
});

// ---------------------------------------------------------------------------
// Unknown table → 404
// ---------------------------------------------------------------------------

it('Reorder: unknown table returns 404', function (): void {
    $this->postJson('/admin/reorder-posts/tables/no_such_table/reorder', ['ids' => [1, 2, 3]])
        ->assertNotFound();
});

// ---------------------------------------------------------------------------
// Non-reorderable table → 422
// ---------------------------------------------------------------------------

it('Reorder: non-reorderable table returns 422', function (): void {
    $ids = reorderIdsByTitle(['a', 'b', 'c']);

    $this->postJson('/admin/reorder-posts/tables/ecposts_plain/reorder', ['ids' => $ids])
        ->assertStatus(422);
});

// ---------------------------------------------------------------------------
// Id outside query scope → rejected (security), nothing persisted
// ---------------------------------------------------------------------------

it('Reorder: id outside the scoped query is rejected and persists nothing', function (): void {
    // 'c' is unpublished; the scoped table only exposes published rows.
    $ids = reorderIdsByTitle(['a', 'b', 'c']);
    $original = EcPost::pluck('sort_order', 'title')->all();

    $this->postJson('/admin/reorder-posts/tables/ecposts_published/reorder', ['ids' => $ids])
        ->assertStatus(422);

    expect(EcPost::pluck('sort_order', 'title')->all())->toBe($original);
});

// ---------------------------------------------------------------------------
// Empty / invalid ids → 422
// ---------------------------------------------------------------------------

it('Reorder: empty ids array fails validation with 422', function (): void {
    $this->postJson('/admin/reorder-posts/tables/ecposts/reorder', ['ids' => []])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['ids']);
});

it('Reorder: missing ids key fails validation with 422', function (): void {
    $this->postJson('/admin/reorder-posts/tables/ecposts/reorder', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['ids']);
});
