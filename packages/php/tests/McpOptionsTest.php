<?php

use Tbtop\Admin\Tests\McpHttpTestCase;

uses(McpHttpTestCase::class);

it('lists a dynamic field\'s options from the named executable\'s form, with its deps', function (): void {
    $result = $this->toolResult($this->callTool('query', [
        'page' => 'mcp-options-page',
        'executable' => 'mcp-options-page:trip',
        'field' => 'city',
        'deps' => ['country' => 'ua'],
        'search' => 'ky',
    ]));

    expect($result['isError'])->toBeFalse()
        ->and($result['json'])->toBe(['options' => [['value' => 'kyiv', 'label' => 'Kyiv']]]);
});

it('refuses an options lookup it cannot answer as the UI would', function (array $arguments, string $message): void {
    $result = $this->toolResult($this->callTool('query', ['page' => 'mcp-options-page', ...$arguments]));

    expect($result['isError'])->toBeTrue()
        ->and($result['json']['message'])->toBe($message);
})->with([
    'executable hidden by mcp(false)' => [
        ['executable' => 'mcp-options-page:saveHidden', 'field' => 'city'],
        '"mcp-options-page:saveHidden" is not executable here. Call search() for this page.',
    ],
    'parent value missing' => [
        ['executable' => 'mcp-options-page:trip', 'field' => 'city'],
        'Field "city" needs deps.country (dependsOn).',
    ],
    'field without dynamic options' => [
        ['executable' => 'mcp-options-page:trip', 'field' => 'note'],
        'Field "note" has no dynamic options; search() lists its options.',
    ],
    'deps on a row query' => [
        ['table' => 'missing', 'deps' => ['country' => 'ua']],
        'deps applies only to an options lookup (executable + field, or table + filter).',
    ],
    'field outside the form' => [
        ['executable' => 'mcp-options-page:trip', 'field' => 'missing'],
        'Field "missing" is not in the form of "mcp-options-page:trip".',
    ],
]);
