<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Tests\BulkHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\BulkPostsPage;
use Tbtop\Admin\Tests\Fixtures\EcPost;

uses(BulkHttpTestCase::class);

beforeEach(function (): void {
    Schema::create('ecposts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->boolean('published')->default(false);
        $table->string('note')->default('');
        $table->string('status')->default('draft');
        $table->unsignedInteger('sort_order')->default(0);
    });
    EcPost::forceCreate(['title' => 'Alpha one', 'published' => true, 'status' => 'live']);
    EcPost::forceCreate(['title' => 'Alpha two', 'published' => false, 'status' => 'draft']);
    EcPost::forceCreate(['title' => 'Bravo', 'published' => true, 'status' => 'live']);
    EcPost::forceCreate(['title' => 'Alpha three', 'published' => true, 'status' => 'draft']);
});

/** @return array<string, string> title => note */
function bulkNotes(): array
{
    return EcPost::query()->orderBy('id')->pluck('note', 'title')->all();
}

/** @param  array<string, mixed>  $bulk */
function runBulk(object $test, string $action, array $selection, array $bulk): TestResponse
{
    return $test->postJson("/admin/bulk-posts/actions/{$action}", ['payload' => ['selection' => $selection, 'bulk' => $bulk]]);
}

it('Bulk: all matching replays the search, so records() and selection hold every matching row', function (): void {
    runBulk($this, 'mark', [1], ['table' => 'ecposts', 'all' => true, 'query' => 'search=alpha&page=2&perPage=1'])->assertOk();

    expect(bulkNotes())->toBe([
        'Alpha one' => 'all:3',
        'Alpha two' => 'all:3',
        'Bravo' => '',
        'Alpha three' => 'all:3',
    ]);
});

it('Bulk: all matching applies filters and the tab, trimmed like the table request', function (): void {
    runBulk($this, 'mark', [], ['table' => 'ecposts', 'all' => true, 'query' => 'tab=live&search=%20alpha%20&filters%5Bpublished%5D=1'])->assertOk();

    expect(bulkNotes())->toBe([
        'Alpha one' => 'all:1',
        'Alpha two' => '',
        'Bravo' => '',
        'Alpha three' => '',
    ]);
});

it('Bulk: all matching stays inside the table query', function (): void {
    runBulk($this, 'markDrafts', [], ['table' => 'drafts', 'all' => true, 'query' => ''])->assertOk();

    expect(bulkNotes())->toBe(['Alpha one' => '', 'Alpha two' => 'all:1', 'Bravo' => '', 'Alpha three' => '']);
});

it('Bulk: without all, records() is the checked keys inside the table query', function (): void {
    runBulk($this, 'markDrafts', [1, 2], ['table' => 'drafts', 'all' => false])->assertOk();

    expect(bulkNotes())->toBe(['Alpha one' => '', 'Alpha two' => 'some:2', 'Bravo' => '', 'Alpha three' => '']);
});

it('Bulk: a submit inside a bulk action modal in a dropdown counts as a bulk action', function (): void {
    runBulk($this, 'modalMarkSave', [], ['table' => 'ecposts', 'all' => true, 'query' => 'search=bravo'])->assertOk();

    expect(bulkNotes()['Bravo'])->toBe('all:1');
});

it('Bulk: a whereKey($ctx->selection) handler acts on every matching row', function (): void {
    runBulk($this, 'deleteSelected', [], ['table' => 'ecposts', 'all' => true, 'query' => 'filters[published]=1'])->assertOk();

    expect(EcPost::query()->pluck('title')->all())->toBe(['Alpha two']);
});

it('Bulk: all matching is refused for a table the action is not a bulk action of', function (string $action, string $table): void {
    runBulk($this, $action, [], ['table' => $table, 'all' => true, 'query' => ''])->assertStatus(422);

    expect(array_values(array_unique(bulkNotes())))->toBe(['']);
})->with([
    'another table' => ['markDrafts', 'ecposts'],
    'a header action' => ['headerMark', 'ecposts'],
    'unknown table' => ['mark', 'nope'],
]);

it('Bulk: records() outside a table bulk action is a LogicException', function (): void {
    $this->withoutExceptionHandling();

    expect(fn () => runBulk($this, 'headerMark', [1], ['table' => 'ecposts', 'all' => false]))
        ->toThrow(LogicException::class, 'records() is only available');
});

it('Bulk: the testing API names the table, so records() works in a callAction() or a bulk modal', function (): void {
    tbtop(BulkPostsPage::class)->callAction('markDrafts', selection: [1, 2])->assertOk();
    tbtop(BulkPostsPage::class)->openAction('modalMark', selection: [3])->callAction('modalMarkSave')->assertOk();

    expect(bulkNotes())->toBe(['Alpha one' => '', 'Alpha two' => 'some:2', 'Bravo' => 'some:1', 'Alpha three' => '']);
});
