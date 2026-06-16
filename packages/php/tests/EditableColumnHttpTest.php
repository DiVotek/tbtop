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
    });
    EcPost::create(['title' => 'First',  'published' => false, 'note' => 'hi']);
    EcPost::create(['title' => 'Second', 'published' => true,  'note' => 'ok']);
});

// ---------------------------------------------------------------------------
// Toggle happy path
// ---------------------------------------------------------------------------

it('Editable: toggle happy path — DB updated, response carries refreshTable effect', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $response = $this->postJson(
        '/admin/editable-posts/cells/ecposts/published',
        ['id' => $post->id, 'value' => true],
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
        ['id' => $post->id, 'value' => 'Updated Title'],
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
        ['id' => $post->id, 'value' => 'bye'],
    );

    $response->assertOk();
    expect($response->json('effects'))->toContain(['kind' => 'refreshTable', 'table' => 'ecposts']);
    expect(EcPost::find($post->id)->note)->toBe('bye');
});

// ---------------------------------------------------------------------------
// Validation rejection
// ---------------------------------------------------------------------------

it('Editable: oversized value fails validation with 422 and errors bag', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $response = $this->postJson(
        '/admin/editable-posts/cells/ecposts/note',
        ['id' => $post->id, 'value' => 'toolong_value'],
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['note']);
});

// ---------------------------------------------------------------------------
// Non-editable column → 404
// ---------------------------------------------------------------------------

it('Editable: non-editable column returns 404', function (): void {
    $post = EcPost::where('title', 'First')->first();

    $this->postJson(
        '/admin/editable-posts/cells/ecposts/nonexistent_col',
        ['id' => $post->id, 'value' => 'x'],
    )->assertNotFound();
});

// ---------------------------------------------------------------------------
// Unknown table → 404
// ---------------------------------------------------------------------------

it('Editable: unknown table returns 404', function (): void {
    $this->postJson(
        '/admin/editable-posts/cells/no_such_table/title',
        ['id' => 1, 'value' => 'x'],
    )->assertNotFound();
});

// ---------------------------------------------------------------------------
// Id outside query scope → 404
// ---------------------------------------------------------------------------

it('Editable: id outside query scope (extra where clause) returns 404', function (): void {
    // 'First' post has published=false; the scoped table only exposes published rows
    $unpublished = EcPost::where('published', false)->first();

    $this->postJson(
        '/admin/editable-posts/cells/ecposts_published/title',
        ['id' => $unpublished->id, 'value' => 'Updated'],
    )->assertNotFound();
});
