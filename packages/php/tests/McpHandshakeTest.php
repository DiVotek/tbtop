<?php

use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Tests\Fixtures\McpPage;
use Tbtop\Admin\Tests\McpHttpTestCase;

uses(McpHttpTestCase::class);

const MCP_TOOLS_FIXTURE = __DIR__.'/Fixtures/mcp-tools-list.json';

/**
 * The tool catalog a client receives: names, descriptions, input schemas and
 * annotations. A plain run fails on drift; UPDATE_FIXTURES=1 regenerates.
 *
 * @param  list<array<string, mixed>>  $tools
 */
function assertToolsMatchSnapshot(array $tools): void
{
    $current = json_encode($tools, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
    if (! file_exists(MCP_TOOLS_FIXTURE) || getenv('UPDATE_FIXTURES')) {
        file_put_contents(MCP_TOOLS_FIXTURE, $current);
    }

    expect($current)->toBe((string) file_get_contents(MCP_TOOLS_FIXTURE));
}

/**
 * @param  array<string, mixed>  $params
 * @param  array<string, string>  $headers
 */
function mcpRpc(McpHttpTestCase $test, string $method, array $params, array $headers = [], ?int $id = 1): TestResponse
{
    $body = ['jsonrpc' => '2.0', 'method' => $method, 'params' => (object) $params];

    return $test->postJson('/admin/mcp', $id === null ? $body : ['id' => $id, ...$body], $headers);
}

it('completes the initialize handshake and lists the three tools as the snapshot', function (): void {
    $init = mcpRpc($this, 'initialize', [
        'protocolVersion' => '2025-11-25',
        'capabilities' => (object) [],
        'clientInfo' => ['name' => 'pest', 'version' => '1'],
    ])->assertOk();

    expect($init->json('result.protocolVersion'))->toBe('2025-11-25')
        ->and($init->json('result.serverInfo.name'))->toBe('Tabletop Admin')
        ->and($init->json('result.capabilities'))->toHaveKey('tools')
        ->and($init->json('result.instructions'))->toContain('search');

    $headers = ['MCP-Protocol-Version' => '2025-11-25'];
    mcpRpc($this, 'notifications/initialized', [], $headers, null)->assertSuccessful();
    $tools = mcpRpc($this, 'tools/list', [], $headers, 2)->assertOk()->json('result.tools');

    expect(array_column($tools, 'name'))->toBe(['search', 'query', 'execute']);
    assertToolsMatchSnapshot($tools);
});

it('serves the stateless 2026-07-28 flow: discover, tools/list and tools/call with per-request meta', function (): void {
    $meta = ['_meta' => [
        'io.modelcontextprotocol/protocolVersion' => '2026-07-28',
        'io.modelcontextprotocol/clientCapabilities' => (object) [],
    ]];
    $headers = fn (string $method, ?string $name = null): array => array_filter([
        'MCP-Protocol-Version' => '2026-07-28',
        'Mcp-Method' => $method,
        'Mcp-Name' => $name,
    ]);

    $discover = mcpRpc($this, 'server/discover', $meta, $headers('server/discover'))->assertOk();
    $tools = mcpRpc($this, 'tools/list', $meta, $headers('tools/list'))->assertOk()->json('result.tools');
    $call = mcpRpc($this, 'tools/call', [...$meta, 'name' => 'execute', 'arguments' => ['id' => 'mcp-page:ping']], $headers('tools/call', 'execute'))->assertOk();

    expect($discover->json('result'))->not->toBeNull()
        ->and(array_column($tools, 'name'))->toBe(['search', 'query', 'execute'])
        ->and($call->json('result.isError'))->toBeFalse()
        ->and(McpPage::$ran)->toHaveKey('ping');
});
