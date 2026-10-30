<?php

use PHPUnit\Framework\AssertionFailedError;
use Tbtop\Admin\Testing\InteractsWithTbtop;
use Tbtop\Admin\Testing\PageTester;
use Tbtop\Admin\Tests\Fixtures\CaPost;
use Tbtop\Admin\Tests\Fixtures\TestingApiPage;
use Tbtop\Admin\Tests\TestingApiTestCase;

uses(TestingApiTestCase::class);

beforeEach(function (): void {
    $this->post = CaPost::create(['title' => 'Alpha', 'published' => true]);
    CaPost::create(['title' => 'Beta', 'published' => false]);
    CaPost::create(['title' => 'Gamma', 'published' => true]);
});

function testingApiPage(): PageTester
{
    return tbtop(TestingApiPage::class, ['post' => test()->post]);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

it('reads field and action state from the wire', function (): void {
    testingApiPage()->assertOk()
        ->assertTitle('Testing API')
        ->assertFieldVisible('title')
        ->assertFieldHidden('internal_notes')
        ->assertFieldDisabled('slug')
        ->assertFieldEnabled('title')
        ->assertFieldValue('title', 'Alpha')
        ->assertFieldValue('published', true)
        ->assertActionHidden('archive');

    $this->actingAs($this->userWithRole('admin'));
    testingApiPage()->assertActionVisible('archive');
});

it('answers 403 from the page gate, and still sends calls so the endpoints are checked too', function (): void {
    $this->actingAs($this->userWithRole('guest'));

    testingApiPage()->assertForbidden();
    testingApiPage()->callAction('archive')->assertForbidden();
    testingApiPage()->table('posts')->assertForbidden();
});

it('names what is on the page when a name is wrong', function (): void {
    expect(fn () => testingApiPage()->assertFieldVisible('nope'))
        ->toThrow(AssertionFailedError::class, 'Field [nope] is not on page')
        ->and(fn () => testingApiPage()->callAction('nope'))
        ->toThrow(AssertionFailedError::class, 'actions quickSave, rename')
        ->and(fn () => testingApiPage()->fill(['nope' => 1]))
        ->toThrow(AssertionFailedError::class, 'Form [post] has no field [nope]');
});

it('exposes the same API through the PHPUnit trait', function (): void {
    $case = new class
    {
        use InteractsWithTbtop;
    };

    $case->tbtop(TestingApiPage::class, ['post' => $this->post])->assertOk();
});

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

it('submits the prefilled record with the filled values and reads the flashed effects', function (): void {
    testingApiPage()->fill(['title' => 'Renamed'])
        ->submit()
        ->assertOk()
        ->assertHasNoErrors()
        ->assertNotified('Saved', 'success')
        ->assertEffect('resetForm', ['form' => 'post'])
        ->assertNoEffects('redirect');

    expect(TestingApiPage::$submitted)->toBe(['title' => 'Renamed', 'slug' => 'post-1', 'published' => true]);
});

it('reads session validation errors, by field, rule or message', function (): void {
    testingApiPage()->form('post')->fill(['title' => str_repeat('x', 21)])->submit()
        ->assertHasErrors('title')
        ->assertHasErrors(['title' => 'max:20'])
        ->assertHasErrors(['title' => 'The Title field must not be greater than 20 characters.'])
        ->assertHasNoErrors('published')
        ->assertNoEffects();

    testingApiPage()->fill(['title' => ''])->submit()->assertHasErrors(['title' => 'required']);

    expect(TestingApiPage::$submitted)->toBeNull()
        ->and(fn () => testingApiPage()->fill(['title' => ''])->submit()->assertHasErrors(['title' => 'max:20']))
        ->toThrow(AssertionFailedError::class, 'error on [title] is not [max:20]');
});

it('tells a redirect away from the way back', function (): void {
    testingApiPage()->fill(['title' => 'leave'])->submit()->assertRedirect('/admin/elsewhere');

    expect(fn () => testingApiPage()->fill(['title' => 'stay'])->submit()->assertRedirect())
        ->toThrow(AssertionFailedError::class, 'redirected nowhere');
});

it('runs a form action with the filled values', function (): void {
    testingApiPage()->form()->fill(['title' => 'Draft'])->callAction('quickSave')->assertNotified('Quick Draft');
    testingApiPage()->callAction('quickSave', form: ['title' => 'Inline'])->assertNotified('Quick Inline');
    testingApiPage()->callAction('quickSave', form: ['title' => ''])->assertStatus(422)->assertHasErrors(['title' => 'required']);
});

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

it('pages, sorts, searches, filters and switches tabs through the table endpoint', function (): void {
    [$alpha, $beta, $gamma] = CaPost::orderBy('id')->get()->all();
    $table = testingApiPage()->table();

    $table->assertColumnVisible('title')->assertColumnHidden('views')
        ->assertCanSeeRecords([$alpha, $beta], inOrder: true)
        ->assertCanNotSeeRecords($gamma)
        ->assertCountRecords(2)
        ->assertTotal(3)
        ->assertTabCount('live', 2)
        ->assertCell($alpha, 'title', 'Alpha');

    $table->page(2)->assertCanSeeRecords([$gamma])->assertCountRecords(1);
    $table->page(1)->sort('title', 'desc')->assertCanSeeRecords([$gamma, $beta], inOrder: true);
    testingApiPage()->table('posts')->search('amm')->assertCanSeeRecords($gamma)->assertTotal(1);
    testingApiPage()->table()->filter('published', false)->assertCanSeeRecords([$beta])->assertTotal(1);
    testingApiPage()->table()->tab('live')->perPage(10)->assertCanSeeRecords([$alpha, $gamma])->assertCanNotSeeRecords($beta);
});

it('refuses table state the table does not declare', function (): void {
    expect(fn () => testingApiPage()->table()->filter('title', 'x'))
        ->toThrow(AssertionFailedError::class, 'has no filter [title]. Filters: published')
        ->and(fn () => testingApiPage()->table()->tab('drafts'))
        ->toThrow(AssertionFailedError::class, 'Tabs: all, live')
        ->and(fn () => testingApiPage()->table()->sort('views'))
        ->toThrow(AssertionFailedError::class, 'no visible column [views]')
        ->and(fn () => testingApiPage()->table('missing'))
        ->toThrow(AssertionFailedError::class, 'Table [missing] is not on page');
});

it('sends a row action the row as the table shows it', function (): void {
    testingApiPage()->table()->callRowAction('rename', $this->post)->assertTableRefreshed('posts');

    expect($this->post->fresh()->title)->toBe('Alpha!')
        ->and(fn () => testingApiPage()->table()->callRowAction('rename', CaPost::where('title', 'Gamma')->first()))
        ->toThrow(AssertionFailedError::class, 'is not on the current page');
});
