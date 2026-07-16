<?php

use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\CrudActionHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\CaPost;

uses(CrudActionHttpTestCase::class);

beforeEach(function (): void {
    Schema::create('caposts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->boolean('published')->default(false);
    });
    CaPost::create(['title' => 'First', 'published' => false]);
    CaPost::create(['title' => 'Second', 'published' => true]);
});

// ---------------------------------------------------------------------------
// CreateAction — inner store action
// ---------------------------------------------------------------------------

it('CreateAction store creates the record and returns closeModal + refreshTable (void closure default tail)', function (): void {
    $response = $this->postJson('/admin/crud-actions/actions/createStore', [
        'payload' => ['form' => ['title' => 'Third']],
    ]);

    $response->assertOk();
    expect(CaPost::where('title', 'Third')->exists())->toBeTrue()
        ->and($response->json('effects'))->toContain(['kind' => 'closeModal'])
        ->and($response->json('effects'))->toContain(['kind' => 'refreshTable']);
});

// ---------------------------------------------------------------------------
// CreateAction — Cancel action only closes the modal
// ---------------------------------------------------------------------------

it('CreateAction cancel action returns only closeModal and mutates nothing', function (): void {
    $response = $this->postJson('/admin/crud-actions/actions/createCancel', [
        'payload' => [],
    ]);

    $response->assertOk();
    expect($response->json('effects'))->toBe([['kind' => 'closeModal']])
        ->and(CaPost::count())->toBe(2);
});

// ---------------------------------------------------------------------------
// DeleteAction — single row
// ---------------------------------------------------------------------------

it('DeleteAction removes the row and returns refreshTable + notify (void closure default tail)', function (): void {
    $post = CaPost::where('title', 'First')->first();

    $response = $this->postJson('/admin/crud-actions/actions/delete', [
        'payload' => ['row' => ['id' => $post->id]],
    ]);

    $response->assertOk();
    expect(CaPost::find($post->id))->toBeNull()
        ->and($response->json('effects'))->toContain(['kind' => 'refreshTable'])
        ->and($response->json('effects'))->toContain(['kind' => 'notify', 'message' => 'Record deleted', 'level' => 'success']);
});

// ---------------------------------------------------------------------------
// DeleteAction — bulk
// ---------------------------------------------------------------------------

it('DeleteAction bulk removes the selected rows', function (): void {
    $ids = CaPost::pluck('id')->all();

    $response = $this->postJson('/admin/crud-actions/actions/delete-selected', [
        'payload' => ['selection' => $ids],
    ]);

    $response->assertOk();
    expect(CaPost::count())->toBe(0)
        ->and($response->json('effects'))->toContain(['kind' => 'refreshTable']);
});

it('DeleteAction bulk with an empty selection is a benign no-op', function (): void {
    $response = $this->postJson('/admin/crud-actions/actions/delete-selected', [
        'payload' => ['selection' => []],
    ]);

    $response->assertOk();
    expect(CaPost::count())->toBe(2)
        ->and($response->json('effects'))->toContain(['kind' => 'notify', 'message' => 'Nothing selected.', 'level' => 'warning']);
});

// ---------------------------------------------------------------------------
// ReplicateAction
// ---------------------------------------------------------------------------

it('ReplicateAction clones the row, incrementing the count', function (): void {
    $post = CaPost::where('title', 'First')->first();

    $response = $this->postJson('/admin/crud-actions/actions/replicate', [
        'payload' => ['row' => ['id' => $post->id]],
    ]);

    $response->assertOk();
    expect(CaPost::where('title', 'First')->count())->toBe(2)
        ->and(CaPost::count())->toBe(3)
        ->and($response->json('effects'))->toContain(['kind' => 'refreshTable']);
});

// ---------------------------------------------------------------------------
// EditAction — modal load endpoint
// ---------------------------------------------------------------------------

it('EditAction load endpoint returns the record only() keys for prefill', function (): void {
    $post = CaPost::where('title', 'Second')->first();

    $response = $this->postJson('/admin/crud-actions/actions/edit/data', [
        'payload' => ['row' => ['id' => $post->id]],
    ]);

    $response->assertOk();
    expect($response->json('data'))->toBe(['title' => 'Second', 'published' => true]);
});

// ---------------------------------------------------------------------------
// EditAction — inner save action
// ---------------------------------------------------------------------------

it('EditAction save updates the DB and returns closeModal + refreshTable (void closure default tail)', function (): void {
    $post = CaPost::where('title', 'First')->first();

    $response = $this->postJson('/admin/crud-actions/actions/editSave', [
        'payload' => [
            'row' => ['id' => $post->id],
            'form' => ['title' => 'Renamed', 'published' => true],
        ],
    ]);

    $response->assertOk();
    $fresh = CaPost::find($post->id);
    expect($fresh->title)->toBe('Renamed')
        ->and($fresh->published)->toBeTrue()
        ->and($response->json('effects'))->toContain(['kind' => 'closeModal'])
        ->and($response->json('effects'))->toContain(['kind' => 'refreshTable']);
});

// ---------------------------------------------------------------------------
// EditAction — Cancel action only closes the modal
// ---------------------------------------------------------------------------

it('EditAction cancel action returns only closeModal and mutates nothing', function (): void {
    $response = $this->postJson('/admin/crud-actions/actions/editCancel', [
        'payload' => [],
    ]);

    $response->assertOk();
    expect($response->json('effects'))->toBe([['kind' => 'closeModal']])
        ->and(CaPost::count())->toBe(2);
});
