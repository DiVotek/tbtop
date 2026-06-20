<?php

use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\Fixtures\SdPost;
use Tbtop\Admin\Tests\SoftDeletesHttpTestCase;

uses(SoftDeletesHttpTestCase::class);

beforeEach(function (): void {
    Schema::create('sdposts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->boolean('published')->default(false);
        $table->softDeletes();
    });
    SdPost::create(['title' => 'Live One']);
    SdPost::create(['title' => 'Live Two']);
    $trashed = SdPost::create(['title' => 'Gone']);
    $trashed->delete();
});

// ---------------------------------------------------------------------------
// Tab scoping rides the existing applyTab seam
// ---------------------------------------------------------------------------

it('active tab (no tab param) returns only non-trashed rows', function (): void {
    $rows = $this->getJson('/admin/soft-deletes/tables/sdposts')->json('data.data');

    expect(array_column($rows, 'title'))->toBe(['Live One', 'Live Two']);
});

it('?tab=trashed returns only trashed rows', function (): void {
    $rows = $this->getJson('/admin/soft-deletes/tables/sdposts?tab=trashed')->json('data.data');

    expect(array_column($rows, 'title'))->toBe(['Gone']);
});

it('?tab=withTrashed returns every row', function (): void {
    $response = $this->getJson('/admin/soft-deletes/tables/sdposts?tab=withTrashed');

    expect($response->json('data.total'))->toBe(3)
        ->and(array_column($response->json('data.data'), 'title'))->toContain('Gone', 'Live One');
});

// ---------------------------------------------------------------------------
// Restore handler reaches the hidden row via withTrashed()
// ---------------------------------------------------------------------------

it('restore action nulls deleted_at and returns refreshTable + notify', function (): void {
    $id = SdPost::withTrashed()->where('title', 'Gone')->value('id');

    $response = $this->postJson('/admin/soft-deletes/actions/restore', [
        'payload' => ['row' => ['id' => $id]],
    ]);

    $response->assertOk();
    expect(SdPost::find($id))->not->toBeNull()
        ->and($response->json('effects'))->toContain(['kind' => 'refreshTable'])
        ->and($response->json('effects'))->toContain(['kind' => 'notify', 'message' => 'Restored', 'level' => 'success']);
});

it('forceDelete action removes the row from withTrashed entirely', function (): void {
    $id = SdPost::withTrashed()->where('title', 'Gone')->value('id');

    $response = $this->postJson('/admin/soft-deletes/actions/forceDelete', [
        'payload' => ['row' => ['id' => $id]],
    ]);

    $response->assertOk();
    expect(SdPost::withTrashed()->find($id))->toBeNull()
        ->and($response->json('effects'))->toContain(['kind' => 'refreshTable']);
});

// ---------------------------------------------------------------------------
// Bulk variants over a selection
// ---------------------------------------------------------------------------

it('bulk restore brings every selected trashed row back', function (): void {
    SdPost::where('title', 'Live One')->first()->delete();
    $ids = SdPost::withTrashed()->whereIn('title', ['Gone', 'Live One'])->pluck('id')->all();

    $response = $this->postJson('/admin/soft-deletes/actions/restoreSelected', [
        'payload' => ['selection' => $ids],
    ]);

    $response->assertOk();
    expect(SdPost::whereIn('id', $ids)->count())->toBe(2)
        ->and($response->json('effects'))->toContain(['kind' => 'notify', 'message' => 'Restored selected', 'level' => 'success']);
});

it('bulk forceDelete permanently removes the selected rows', function (): void {
    $id = SdPost::withTrashed()->where('title', 'Gone')->value('id');

    $response = $this->postJson('/admin/soft-deletes/actions/forceDeleteSelected', [
        'payload' => ['selection' => [$id]],
    ]);

    $response->assertOk();
    expect(SdPost::withTrashed()->find($id))->toBeNull();
});

it('bulk restore with an empty selection is a benign no-op', function (): void {
    $response = $this->postJson('/admin/soft-deletes/actions/restoreSelected', [
        'payload' => ['selection' => []],
    ]);

    $response->assertOk();
    expect(SdPost::onlyTrashed()->count())->toBe(1)
        ->and($response->json('effects'))->toContain(['kind' => 'notify', 'message' => 'Nothing selected.', 'level' => 'warning']);
});
