<?php

use Tbtop\Admin\Tests\McpHttpTestCase;

uses(McpHttpTestCase::class);

it('sends a form\'s current values only when asked', function (): void {
    $form = fn (array $args): array => array_column(
        $this->toolResult($this->callTool('search', ['page' => 'mcp-modal-page', ...$args]))['json']['executables'],
        null,
        'id',
    )['mcp-modal-page:createStore']['form'];

    expect($form([]))->not->toHaveKey('values')
        ->and($form(['values' => true])['values'])->toBe(['name' => 'Draft']);
});

it('lists a field\'s helper text as help', function (): void {
    $invite = array_column(
        $this->toolResult($this->callTool('search', ['page' => 'mcp-modal-page']))['json']['executables'],
        null,
        'id',
    )['mcp-modal-page:inviteSend'];

    expect($invite['form']['fields'][0])->toMatchArray(['name' => 'email', 'help' => 'Work address']);
});

it('keeps forms out of the bare search index', function (): void {
    $index = array_column($this->toolResult($this->callTool('search'))['json']['pages'], null, 'page');

    expect($index['mcp-modal-page']['executables'])->toContain(['id' => 'mcp-modal-page:inviteSend', 'kind' => 'action', 'label' => 'Send'])
        ->and(json_encode($index))->not->toContain('"fields"')
        ->and(json_encode($index))->not->toContain('"values"');
});
