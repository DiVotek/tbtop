<?php

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\TableBuilder;

function encodeCollected(mixed $value): array
{
    return json_decode((string) json_encode($value), true);
}

/** An action the current user is never allowed to see. */
function gatedCollectedAction(S $s, string $name): mixed
{
    Gate::define('never', fn (?object $user) => false);

    return $s->action($name)->label('Hidden')->visit('/')->authorize('never');
}

// ---------------------------------------------------------------------------
// The pass runs inside Node, so it catches every way a node gets built
// ---------------------------------------------------------------------------
// `new Node($kind, [...])` is the only way to author a custom block in PHP —
// the demo does it (TwoFactorSetupPage), and registerBlock/defineFieldClient
// makes it a documented extension point. Filtering only inside the S factories
// leaves those nodes unfiltered.

it('drops an unauthorized child from a hand-built Node', function () {
    $s = new S;

    $node = new Node('row', ['children' => [gatedCollectedAction($s, 'hidden'), $s->action('shown')->visit('/')]]);

    $names = array_column(encodeCollected($node)['options']['children'], 'name');
    expect($names)->toBe(['shown']);
});

it('drops an unauthorized field from a hand-built Node', function () {
    $s = new S;

    $node = new Node('customForm', ['fields' => [gatedCollectedAction($s, 'hidden'), $s->text('kept')]]);

    $names = array_column(encodeCollected($node)['options']['fields'], 'name');
    expect($names)->toBe(['kept']);
});

it('drops an unauthorized child from a layout factory', function () {
    $s = new S;

    $node = $s->stack([gatedCollectedAction($s, 'hidden'), $s->action('shown')->visit('/')]);

    $names = array_column(encodeCollected($node)['options']['children'], 'name');
    expect($names)->toBe(['shown']);
});

it('leaves an authorized child list untouched', function () {
    Gate::define('always', fn (?object $user) => true);
    $s = new S;

    $node = new Node('row', ['children' => [$s->action('a')->visit('/')->authorize('always'), $s->action('b')->visit('/')]]);

    $names = array_column(encodeCollected($node)['options']['children'], 'name');
    expect($names)->toBe(['a', 'b']);
});

it('reindexes the surviving children so the wire carries a JSON array', function () {
    $s = new S;

    $node = new Node('row', ['children' => [gatedCollectedAction($s, 'hidden'), $s->action('shown')->visit('/')]]);

    expect(encodeCollected($node)['options']['children'])->toBeArray()
        ->and(json_encode($node))->toContain('"children":[{');
});

it('filters an already-filtered list to the same list', function () {
    $s = new S;
    $children = [gatedCollectedAction($s, 'hidden'), $s->action('shown')->visit('/')];

    $once = S::normalizeChildren($children);
    $twice = S::normalizeChildren($once);

    expect(encodeCollected($twice))->toBe(encodeCollected($once))
        ->and(array_column(encodeCollected($twice), 'name'))->toBe(['shown']);
});

it('serializes a node whose children were all excluded as an empty list', function () {
    $s = new S;

    $node = new Node('row', ['children' => [gatedCollectedAction($s, 'hidden')]]);

    expect(encodeCollected($node)['options']['children'])->toBe([]);
});

// ---------------------------------------------------------------------------
// A tab whose body is excluded keeps a renderable body
// ---------------------------------------------------------------------------
// The schema requires tabs[].body and types it as a node; the client
// dereferences tab.body unconditionally. An excluded body must therefore
// become an empty container, never null. The tab itself stays: a vanished tab
// reads as a DSL bug, an empty one reads as a permission.

it('substitutes an empty container for a tab body the user may not see', function () {
    $s = new S;

    $node = $s->tabs([['label' => 'One', 'body' => gatedCollectedAction($s, 'hidden')]]);

    $tab = encodeCollected($node)['options']['tabs'][0];
    expect($tab['label'])->toBe('One')
        ->and($tab['body'])->not->toBeNull()
        ->and($tab['body']['kind'])->toBe('stack')
        ->and($tab['body']['options']['children'])->toBe([]);
});

it('keeps a tab whose body the user may see', function () {
    Gate::define('always', fn (?object $user) => true);
    $s = new S;

    $node = $s->tabs([['label' => 'One', 'body' => $s->action('shown')->visit('/')->authorize('always')]]);

    $tab = encodeCollected($node)['options']['tabs'][0];
    expect($tab['body']['name'])->toBe('shown');
});

// ---------------------------------------------------------------------------
// Table-specific child keys
// ---------------------------------------------------------------------------
// Node has no general knowledge of 'rowActions'/'headerActions'/'bulkActions'/
// 'filters', so TableBuilder::toNode() runs the pass over them itself. These
// setters deliberately store the raw list and filter at serialization time.

it('drops unauthorized table actions at serialization', function (string $method, string $key) {
    $s = new S;
    $table = (new TableBuilder('t'))->$method([
        gatedCollectedAction($s, 'hidden'),
        $s->action('shown')->visit('/'),
    ]);

    $names = array_column(encodeCollected($table->toNode())['options'][$key], 'name');
    expect($names)->toBe(['shown']);
})->with([
    ['rowActions', 'rowActions'],
    ['headerActions', 'headerActions'],
    ['bulkActions', 'bulkActions'],
]);
