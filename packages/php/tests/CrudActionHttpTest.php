<?php

use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\CrudActionHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\CaPost;
use Tbtop\Admin\Tests\Fixtures\CrudActionsPage;

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
// CreateAction — a header modal: the tester opens it and submits through its
// one form action (createStore), the way the client does.
// ---------------------------------------------------------------------------

it('CreateAction store creates the record and returns closeModal + refreshTable (void closure default tail)', function (): void {
    tbtop(CrudActionsPage::class)
        ->callAction('create', form: ['title' => 'Third'])
        ->assertHasNoErrors()
        ->assertModalClosed()
        ->assertTableRefreshed()
        ->assertNotified('Created');

    expect(CaPost::where('title', 'Third')->exists())->toBeTrue();
});

it('CreateAction cancel action returns only closeModal and mutates nothing', function (): void {
    $result = tbtop(CrudActionsPage::class)->openAction('create')->callAction('createCancel');

    expect($result->assertModalClosed()->effects())->toBe([['kind' => 'closeModal']])
        ->and(CaPost::count())->toBe(2);
});

// ---------------------------------------------------------------------------
// DeleteAction
// ---------------------------------------------------------------------------

it('DeleteAction removes the row and returns refreshTable + notify (void closure default tail)', function (): void {
    $post = CaPost::where('title', 'First')->first();

    tbtop(CrudActionsPage::class)->table()
        ->callRowAction('delete', $post)
        ->assertTableRefreshed()
        ->assertNotified('Record deleted', 'success');

    expect(CaPost::find($post->id))->toBeNull();
});

it('DeleteAction bulk removes the selected rows', function (): void {
    tbtop(CrudActionsPage::class)->table()
        ->callBulkAction('delete-selected', CaPost::all())
        ->assertTableRefreshed();

    expect(CaPost::count())->toBe(0);
});

it('DeleteAction bulk with an empty selection is a benign no-op', function (): void {
    tbtop(CrudActionsPage::class)->table()
        ->callBulkAction('delete-selected', [])
        ->assertOk()
        ->assertNotified('Nothing selected.', 'warning');

    expect(CaPost::count())->toBe(2);
});

// ---------------------------------------------------------------------------
// ReplicateAction
// ---------------------------------------------------------------------------

it('ReplicateAction clones the row, incrementing the count', function (): void {
    tbtop(CrudActionsPage::class)->table()
        ->callRowAction('replicate', CaPost::where('title', 'First')->first())
        ->assertTableRefreshed();

    expect(CaPost::where('title', 'First')->count())->toBe(2)
        ->and(CaPost::count())->toBe(3);
});

// ---------------------------------------------------------------------------
// EditAction — a row modal with a query(): it opens prefilled, then saves
// through editSave with the same row.
// ---------------------------------------------------------------------------

it('EditAction load endpoint returns the record only() keys for prefill', function (): void {
    tbtop(CrudActionsPage::class)->table()
        ->openRowAction('edit', CaPost::where('title', 'Second')->first())
        ->assertFormData(['title' => 'Second', 'published' => true]);
});

it('EditAction save updates the DB and returns closeModal + refreshTable (void closure default tail)', function (): void {
    $post = CaPost::where('title', 'First')->first();

    tbtop(CrudActionsPage::class)->table()
        ->openRowAction('edit', $post)
        ->fill(['title' => 'Renamed', 'published' => true])
        ->submit()
        ->assertHasNoErrors()
        ->assertModalClosed()
        ->assertTableRefreshed();

    $fresh = CaPost::find($post->id);
    expect($fresh->title)->toBe('Renamed')
        ->and($fresh->published)->toBeTrue();
});

it('EditAction cancel action returns only closeModal and mutates nothing', function (): void {
    $result = tbtop(CrudActionsPage::class)->table()->openRowAction('edit', CaPost::first())->callAction('editCancel');

    expect($result->effects())->toBe([['kind' => 'closeModal']])
        ->and(CaPost::count())->toBe(2);
});

// ---------------------------------------------------------------------------
// Action-endpoint validation — an action submits into the form it is nested in,
// so that form's declared rules apply, the same way FormSubmitController applies
// a page form's rules.
// ---------------------------------------------------------------------------

it('rejects an action submission missing a key its form declares required', function (): void {
    tbtop(CrudActionsPage::class)
        ->callAction('create', form: ['title' => null])
        ->assertStatus(422)
        ->assertHasErrors(['title' => 'required'])
        ->assertNoEffects();

    expect(CaPost::count())->toBe(2);
});

it('rejects an action submission violating a rule its form declares', function (): void {
    tbtop(CrudActionsPage::class)
        ->callAction('create', form: ['title' => str_repeat('x', 201)])
        ->assertHasErrors(['title' => 'max:200']);

    expect(CaPost::count())->toBe(2);
});

it('validates a form nested in a row action', function (): void {
    $post = CaPost::where('title', 'First')->firstOrFail();

    tbtop(CrudActionsPage::class)->table()
        ->openRowAction('edit', $post)
        ->fill(['title' => ''])
        ->submit()
        ->assertHasErrors(['title' => 'required']);

    expect($post->fresh()->title)->toBe('First');
});

it('validates a form nested in a bulk action', function (): void {
    tbtop(CrudActionsPage::class)->table()
        ->callBulkAction('bulkCreate', [], form: ['title' => ''])
        ->assertHasErrors('title');

    expect(CaPost::count())->toBe(2);
});

it('drops a form key no field on the action form declares', function (): void {
    CrudActionsPage::$lastStoreForm = null;

    $this->postJson('/admin/crud-actions/actions/createStore', [
        'payload' => ['form' => ['title' => 'Third', 'isAdmin' => true]],
    ])->assertOk();

    expect(CrudActionsPage::$lastStoreForm)->toBe(['title' => 'Third']);
});

it('leaves the payload untouched for an action with no enclosing form', function (): void {
    $response = $this->postJson('/admin/crud-actions/actions/editCancel', [
        'payload' => ['form' => ['anything' => 'goes']],
    ]);

    $response->assertOk();
});
