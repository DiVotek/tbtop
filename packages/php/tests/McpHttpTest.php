<?php

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Tests\Fixtures\McpPage;
use Tbtop\Admin\Tests\McpHttpTestCase;

uses(McpHttpTestCase::class);

// Both MCP discovery and the controller gate through PageGate; the discovery gate fires first.
it('denies execute to a user who fails the page gate, without running the handler', function (): void {
    McpHttpTestCase::$pageAllowed = false;

    $result = $this->toolResult($this->callTool('execute', ['id' => 'mcp-page:ping']));

    expect($result['isError'])->toBeTrue()
        ->and($result['text'])->toContain('Forbidden')
        ->and(McpPage::$ran)->toBe([]);
});

it('returns validation errors and runs nothing for invalid form input', function (string $id): void {
    $result = $this->toolResult($this->callTool('execute', ['id' => $id, 'form' => ['name' => '']]));

    expect($result['isError'])->toBeTrue()
        ->and($result['json']['errors'])->toHaveKey('name')
        ->and(McpPage::$ran)->toBe([]);
})->with([
    'action with needs form' => 'mcp-page:save',
    'onSubmit form' => 'mcp-page:main',
]);

it('hands a row returned by query to a row action as $ctx->row', function (): void {
    DB::table('items')->insert(['name' => 'Widget']);

    $rows = $this->toolResult($this->callTool('query', ['page' => 'mcp-page', 'table' => 'items']));
    $row = $rows['json']['data'][0];
    $result = $this->toolResult($this->callTool('execute', ['id' => 'mcp-page:rename', 'row' => $row]));

    expect($result['isError'])->toBeFalse()
        ->and($row)->toMatchArray(['id' => 1, 'name' => 'WIDGET'])
        ->and(McpPage::$ran['rename'])->toBe($row);
});

it('lists a parameterised page\'s actions only with params, and hides opted-out and client-only actions', function (): void {
    $listing = $this->toolResult($this->callTool('search'))['json']['pages'];
    $bySlug = array_column($listing, null, 'page');
    $record = $this->toolResult($this->callTool('search', ['page' => 'mcp-record-page', 'params' => ['record' => '7']]))['json'];

    $ids = array_column($bySlug['mcp-page']['executables'], 'id');
    expect($bySlug['mcp-record-page'])->toBe(['page' => 'mcp-record-page', 'title' => 'Mcp Record Page', 'params' => ['record']])
        ->and($ids)->toContain('mcp-page:ping', 'mcp-page:save', 'mcp-page:main', 'mcp-page:rename')
        ->and($ids)->not->toContain('mcp-page:hidden')
        ->and($ids)->not->toContain('mcp-page:clientOnly')
        ->and(array_column($bySlug['mcp-page']['excluded'], 'id'))->toBe(['mcp-page:clientOnly'])
        ->and(array_column($record['executables'], 'id'))->toBe(['mcp-record-page:archive']);
});

it('refuses params that would steer a call onto an opted-out sibling page', function (string $tool, array $arguments): void {
    $result = $this->toolResult($this->callTool($tool, $arguments));

    expect($result['isError'])->toBeTrue()
        ->and(McpPage::$ran)->toBe([]);
})->with([
    'search' => ['search', ['page' => 'mcp-record-page', 'params' => ['record' => '7/secret']]],
    'execute' => ['execute', ['id' => 'mcp-record-page:archive', 'params' => ['record' => '7/secret']]],
]);

it('hides a page from search and refuses query on it when the user fails its gate', function (): void {
    DB::table('items')->insert(['name' => 'Widget']);
    McpHttpTestCase::$pageAllowed = false;

    $pages = array_column($this->toolResult($this->callTool('search'))['json']['pages'], 'page');
    $query = $this->toolResult($this->callTool('query', ['page' => 'mcp-page', 'table' => 'items']));

    expect($pages)->not->toContain('mcp-page')
        ->and($pages)->toContain('mcp-record-page')
        ->and($query['isError'])->toBeTrue()
        ->and($query['text'])->not->toContain('Widget');
});
