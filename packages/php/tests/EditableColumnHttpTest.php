<?php

use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\EditableColumnHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\EcPost;

uses(EditableColumnHttpTestCase::class);

beforeEach(function (): void {
    Schema::create('ecposts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->boolean('published')->default(false);
        $table->string('note')->default('');
        $table->string('status')->default('draft');
    });
    EcPost::create(['title' => 'First',  'published' => false, 'note' => 'hi', 'status' => 'draft']);
    EcPost::create(['title' => 'Second', 'published' => true,  'note' => 'ok', 'status' => 'draft']);
});

// ---------------------------------------------------------------------------
// Toggle happy path
// ---------------------------------------------------------------------------

it('Editable: toggle happy path — DB updated, response carries refreshTable effect', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $response = $this->postJson(
        '/admin/editable-posts/cells/ecposts/published',
        ['payload' => ['id' => $post->id, 'value' => true]],
    );

    $response->assertOk();
    expect($response->json('effects'))->toContain(['kind' => 'refreshTable', 'table' => 'ecposts']);
    expect(EcPost::find($post->id)->published)->toBeTrue();
});

// ---------------------------------------------------------------------------
// Text + custom onSave returning custom Effects
// ---------------------------------------------------------------------------

it('Editable: textInput onSave returning custom Effects — DB updated, effects returned', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $response = $this->postJson(
        '/admin/editable-posts/cells/ecposts/title',
        ['payload' => ['id' => $post->id, 'value' => 'Updated Title']],
    );

    $response->assertOk();
    expect($response->json('effects'))->toContain(['kind' => 'refreshTable', 'table' => 'ecposts']);
    expect(EcPost::find($post->id)->title)->toBe('Updated Title');
});

// ---------------------------------------------------------------------------
// onSave returning void — default refreshTable effect
// ---------------------------------------------------------------------------

it('Editable: onSave returning void triggers default refreshTable effect', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $response = $this->postJson(
        '/admin/editable-posts/cells/ecposts/note',
        ['payload' => ['id' => $post->id, 'value' => 'bye']],
    );

    $response->assertOk();
    expect($response->json('effects'))->toContain(['kind' => 'refreshTable', 'table' => 'ecposts']);
    expect(EcPost::find($post->id)->note)->toBe('bye');
});

// ---------------------------------------------------------------------------
// Select column — value persists like text through the same /cells endpoint
// ---------------------------------------------------------------------------

it('Editable: select value saves through the existing /cells endpoint', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $response = $this->postJson(
        '/admin/editable-posts/cells/ecposts/status',
        ['payload' => ['id' => $post->id, 'value' => 'published']],
    );

    $response->assertOk();
    expect($response->json('effects'))->toContain(['kind' => 'refreshTable', 'table' => 'ecposts']);
    expect(EcPost::find($post->id)->status)->toBe('published');
});

it('Editable: select value outside the in: rule fails validation with 422', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $this->postJson(
        '/admin/editable-posts/cells/ecposts/status',
        ['payload' => ['id' => $post->id, 'value' => 'archived']],
    )->assertStatus(422)->assertJsonValidationErrors(['status']);

    expect(EcPost::find($post->id)->status)->toBe('draft');
});

// ---------------------------------------------------------------------------
// Validation rejection
// ---------------------------------------------------------------------------

it('Editable: oversized value fails validation with 422 and errors bag', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $response = $this->postJson(
        '/admin/editable-posts/cells/ecposts/note',
        ['payload' => ['id' => $post->id, 'value' => 'toolong_value']],
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['note']);
});

it('Editable: validation error message uses the column label, not the raw name', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $response = $this->postJson(
        '/admin/editable-posts/cells/ecposts/note',
        ['payload' => ['id' => $post->id, 'value' => 'toolong_value']],
    );

    $message = $response->json('errors.note.0');
    expect($message)->toContain('Note')
        ->and($message)->not->toContain('note must');
});

// ---------------------------------------------------------------------------
// Non-editable column → 404
// ---------------------------------------------------------------------------

it('Editable: non-editable column returns 404', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $this->postJson(
        '/admin/editable-posts/cells/ecposts/nonexistent_col',
        ['payload' => ['id' => $post->id, 'value' => 'x']],
    )->assertNotFound();
});

// ---------------------------------------------------------------------------
// Unknown table → 404
// ---------------------------------------------------------------------------

it('Editable: unknown table returns 404', function (): void {
    $this->postJson(
        '/admin/editable-posts/cells/no_such_table/title',
        ['payload' => ['id' => 1, 'value' => 'x']],
    )->assertNotFound();
});

// ---------------------------------------------------------------------------
// Server-hidden column → 404 (visible(false) is an authz gate)
// ---------------------------------------------------------------------------

it('Editable: server-hidden column (visible false) returns 404 and does not save', function (): void {
    $post = EcPost::where('title', 'First')->first();
    $originalNote = $post->note;

    $this->postJson(
        '/admin/editable-posts/cells/ecposts/secret',
        ['payload' => ['id' => $post->id, 'value' => 'leaked']],
    )->assertNotFound();

    expect(EcPost::find($post->id)->note)->toBe($originalNote);
});

// ---------------------------------------------------------------------------
// Id outside query scope → 404
// ---------------------------------------------------------------------------

it('Editable: id outside query scope (extra where clause) returns 404', function (): void {
    // 'First' post has published=false; the scoped table only exposes published rows
    $unpublished = EcPost::where('published', false)->first();

    $this->postJson(
        '/admin/editable-posts/cells/ecposts_published/title',
        ['payload' => ['id' => $unpublished->id, 'value' => 'Updated']],
    )->assertNotFound();
});
