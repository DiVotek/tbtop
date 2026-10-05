<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use Tbtop\Admin\Tests\Fixtures\McpPage;
use Tbtop\Admin\Tests\McpHttpTestCase;

uses(McpHttpTestCase::class);

it('refuses an execute call that omits what the action needs, without running the handler', function (array $arguments, string $message): void {
    $result = $this->toolResult($this->callTool('execute', $arguments));

    expect($result['isError'])->toBeTrue()
        ->and($result['json']['message'])->toBe($message)
        ->and(McpPage::$ran)->toBe([]);
})->with([
    'no row' => [['id' => 'mcp-page:rename'], '"mcp-page:rename" needs row. Pass a row from query().'],
    'row without its key' => [
        ['id' => 'mcp-page:rename', 'row' => ['name' => 'WIDGET']],
        '"mcp-page:rename" needs a row with its key "id". Pass a row from query() unchanged.',
    ],
    'row with a null key' => [
        ['id' => 'mcp-page:rename', 'row' => ['id' => null]],
        '"mcp-page:rename" needs a row with its key "id". Pass a row from query() unchanged.',
    ],
    'row with an array key' => [
        ['id' => 'mcp-page:rename', 'row' => ['id' => ['a' => 1]]],
        '"mcp-page:rename" needs a row with its key "id". Pass a row from query() unchanged.',
    ],
    'no selection' => [['id' => 'mcp-page:archiveMany'], '"mcp-page:archiveMany" needs selection. Pass row keys from query() as selection.'],
    'empty selection' => [
        ['id' => 'mcp-page:archiveMany', 'selection' => []],
        '"mcp-page:archiveMany" needs selection. Pass row keys from query() as selection.',
    ],
    'selection of null keys' => [
        ['id' => 'mcp-page:archiveMany', 'selection' => [null, '']],
        '"mcp-page:archiveMany" needs selection. Pass row keys from query() as selection.',
    ],
    'no form' => [['id' => 'mcp-page:save'], '"mcp-page:save" needs form. Pass form with the fields search() lists.'],
    'several missing' => [
        ['id' => 'mcp-edges-page:saveRow'],
        '"mcp-edges-page:saveRow" needs row, form. Pass a row from query(). Pass form with the fields search() lists.',
    ],
]);

it('counts an empty form as sent, leaving the verdict to validation', function (): void {
    $result = $this->toolResult($this->callTool('execute', ['id' => 'mcp-page:save', 'form' => []]));

    expect($result['json']['message'])->toBe('Validation failed; nothing was run.')
        ->and($result['json']['errors'])->toHaveKey('name')
        ->and(McpPage::$ran)->toBe([]);
});

it('refuses a query argument the table does not list in search()', function (array $arguments, string $message): void {
    DB::table('items')->insert(['name' => 'Widget']);

    $result = $this->toolResult($this->callTool('query', ['page' => 'mcp-edges-page', ...$arguments]));

    expect($result['isError'])->toBeTrue()
        ->and($result['json']['message'])->toBe($message);
})->with([
    'sort' => [['table' => 'plain', 'sort' => 'name'], 'Unknown sort "name" for table "plain".'],
    'perPage' => [['table' => 'catalog', 'perPage' => 7], 'perPage 7 is not one of 5, 10, 20.'],
    'filter' => [['table' => 'catalog', 'filters' => ['nonexistent' => 'x']], 'Unknown filter "nonexistent" for table "catalog".'],
    'filter with an empty value' => [['table' => 'plain', 'filters' => ['name' => '']], 'Unknown filter "name" for table "plain".'],
    'columnSearch' => [['table' => 'catalog', 'columnSearch' => ['id' => '1']], 'Column "id" is not searchable in table "catalog".'],
    'search' => [['table' => 'plain', 'search' => 'wid'], 'Table "plain" has no search.'],
    'dir other than asc or desc' => [['table' => 'catalog', 'sort' => 'name', 'dir' => 'sideways'], 'dir must be "asc" or "desc".'],
    'search that is not text' => [['table' => 'catalog', 'search' => ['a']], 'search must be text for table "catalog".'],
    'columnSearch that is not text' => [['table' => 'catalog', 'columnSearch' => ['name' => ['a']]], 'columnSearch "name" must be text for table "catalog".'],
    'dir without sort or default' => [['table' => 'plain', 'dir' => 'desc'], 'dir needs sort for table "plain".'],
]);

it('accepts what search() lists, the default sort and the default perPage', function (): void {
    DB::table('items')->insert([['name' => 'Alpha'], ['name' => 'Beta']]);
    $catalog = array_column($this->toolResult($this->callTool('search', ['page' => 'mcp-edges-page']))['json']['tables'], null, 'table')['catalog'];
    $query = fn (array $arguments): array => $this->toolResult($this->callTool('query', ['page' => 'mcp-edges-page', 'table' => 'catalog', ...$arguments]))['json'];

    $listed = $query(['sort' => 'name', 'dir' => 'desc', 'perPage' => 10, 'filters' => ['name' => 'a'], 'columnSearch' => ['name' => 'a'], 'search' => 'a']);
    $byDefault = $query(['sort' => 'id', 'perPage' => 5]);
    $loneDir = $query(['dir' => 'asc']);
    $empty = $this->toolResult($this->callTool('query', ['page' => 'mcp-edges-page', 'table' => 'plain', 'search' => '', 'filters' => [], 'sort' => '']))['json'];

    expect($catalog['sortable'])->toBe(['name', 'id'])
        ->and(array_column($listed['data'], 'name'))->toBe(['Beta', 'Alpha'])
        ->and($byDefault['perPage'])->toBe(5)
        ->and(array_column($byDefault['data'], 'name'))->toBe(['Beta', 'Alpha'])
        ->and(array_column($loneDir['data'], 'name'))->toBe(['Alpha', 'Beta'])
        ->and($empty['total'])->toBe(2);
});

it('checks the page gate before any query argument', function (): void {
    McpHttpTestCase::$pageAllowed = false;

    $result = $this->toolResult($this->callTool('query', ['page' => 'mcp-edges-page', 'table' => 'plain', 'sort' => 'bogus']));

    expect($result['isError'])->toBeTrue()
        ->and($result['json']['message'])->toStartWith('Forbidden');
});

it('excludes an executable whose validated form has a required field MCP cannot fill', function (): void {
    $page = $this->toolResult($this->callTool('search', ['page' => 'mcp-edges-page']))['json'];
    $excluded = array_column($page['excluded'], 'reason', 'id');

    expect($excluded)->toMatchArray([
        'mcp-edges-page:photo' => 'field "file" is required and cannot be filled over MCP (upload)',
        'mcp-edges-page:gallery' => 'field "images" is required and cannot be filled over MCP (upload)',
        'mcp-edges-page:article' => 'fields "cover", "body" are required and cannot be filled over MCP (upload, richtext)',
        'mcp-edges-page:submitDraft' => 'field "scan" is required and cannot be filled over MCP (upload)',
    ])
        ->and(array_column($page['executables'], 'id'))->toContain('mcp-edges-page:retouch', 'mcp-edges-page:saveDraft');
});

it('refuses to execute a form with a required excluded field; sometimes and withoutValidation stay executable', function (): void {
    $call = fn (string $id, array $form): array => $this->toolResult($this->callTool('execute', ['id' => $id, 'form' => $form]));

    $photo = $call('mcp-edges-page:photo', ['caption' => 'x']);
    $draft = $call('mcp-edges-page:submitDraft', ['remark' => 'x']);
    $retouch = $call('mcp-edges-page:retouch', ['alt' => 'x']);
    $saveDraft = $call('mcp-edges-page:saveDraft', ['remark' => 'x']);

    expect($photo['json']['message'])->toBe('"mcp-edges-page:photo" is not executable here. Call search() for this page.')
        ->and($draft['json']['message'])->toBe('"mcp-edges-page:submitDraft" is not executable here. Call search() for this page.')
        ->and($retouch['isError'])->toBeFalse()
        ->and($saveDraft['isError'])->toBeFalse()
        ->and(array_keys(McpPage::$ran))->toBe(['retouch', 'saveDraft']);
});

it('answers an unexpected exception with a generic error, reported once and without its text', function (string $id): void {
    config(['app.debug' => true]);
    Exceptions::fake();

    $result = $this->toolResult($this->callTool('execute', ['id' => $id]));

    expect($result['isError'])->toBeTrue()
        ->and($result['json'])->toBe(['message' => 'Server error; see the application log.'])
        ->and($result['text'])->not->toContain('secret');
    Exceptions::assertReportedCount(1);
})->with([
    'plain throwable' => 'mcp-edges-page:explode',
    'HTTP 500' => 'mcp-edges-page:abort500',
]);

it('still echoes an HTTP 4xx message, unreported', function (): void {
    Exceptions::fake();

    $result = $this->toolResult($this->callTool('execute', ['id' => 'mcp-edges-page:abort409']));

    expect($result['json'])->toBe(['message' => 'Already archived.']);
    Exceptions::assertNothingReported();
});
