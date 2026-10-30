<?php

use Tbtop\Admin\Tests\Fixtures\McpModalPage;
use Tbtop\Admin\Tests\McpHttpTestCase;

uses(McpHttpTestCase::class);

beforeEach(fn () => McpModalPage::$ran = []);

it('lists the save action of a form inside a modal, with that form', function (): void {
    $result = $this->toolResult($this->callTool('search', ['page' => 'mcp-modal-page']));
    $byId = collect($result['json']['executables'])->keyBy('id');

    expect($byId)->toHaveKeys(['mcp-modal-page:createStore', 'mcp-modal-page:inviteSend'])
        ->and($byId['mcp-modal-page:createStore']['needs'])->toBe(['form'])
        ->and(array_column($byId['mcp-modal-page:createStore']['form']['fields'], 'name'))->toBe(['name'])
        ->and(array_column($byId['mcp-modal-page:inviteSend']['form']['fields'], 'name'))->toBe(['email']);
});

it('executes a modal form action with its form validated', function (): void {
    $ok = $this->toolResult($this->callTool('execute', ['id' => 'mcp-modal-page:createStore', 'form' => ['name' => 'Lisbon']]));
    $invalid = $this->toolResult($this->callTool('execute', ['id' => 'mcp-modal-page:inviteSend', 'form' => ['email' => 'nope']]));

    expect($ok['isError'])->toBeFalse()
        ->and(McpModalPage::$ran['createStore'])->toBe(['name' => 'Lisbon'])
        ->and($invalid['isError'])->toBeTrue()
        ->and($invalid['json']['errors'])->toHaveKey('email')
        ->and(McpModalPage::$ran)->not->toHaveKey('inviteSend');
});
