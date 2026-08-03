<?php

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\TableBuilder;

function encodeWhen(mixed $value): array
{
    return json_decode((string) json_encode($value), true);
}

// ---------------------------------------------------------------------------
// when(false) removes the node from every container kind
// ---------------------------------------------------------------------------
// Conditional existence has to hold at every collection point, not only the
// ones the author remembered. Each container reaches the filter by a different
// route: the layout factories through the Node constructor, the table keys
// through S::normalizeChildren(), a tab body through the single-value pass.

it('drops a when(false) child from a layout container', function (string $factory) {
    $s = new S;
    $children = [$s->text('gone')->when(false), $s->text('kept')];

    $node = match ($factory) {
        'stack' => $s->stack($children),
        'row' => $s->row($children),
        'aside' => $s->aside($children),
        'grid' => $s->grid(['cols' => 2], $children),
        'section' => $s->section(['title' => 'S'], $children),
        'collapsible' => $s->collapsible(['label' => 'C'], $children),
        'flex' => $s->flex($children),
    };

    $names = array_column(encodeWhen($node)['options']['children'], 'name');
    expect($names)->toBe(['kept']);
})->with(['stack', 'row', 'aside', 'grid', 'section', 'collapsible', 'flex']);

it('drops a when(false) field from a form', function () {
    $s = new S;

    $form = $s->form('f', [$s->text('gone')->when(false), $s->text('kept')]);

    $names = array_column(encodeWhen($form->toNode())['options']['children'], 'name');
    expect($names)->toBe(['kept']);
});

it('drops a when(false) sub-field from a repeater', function () {
    $s = new S;

    $repeater = $s->repeater('rows')->fields([
        $s->text('gone')->when(false),
        $s->text('kept'),
    ]);

    $names = array_column(encodeWhen($repeater->toNode())['options']['fields'], 'name');
    expect($names)->toBe(['kept']);
});

it('drops a when(false) field from a creatable sub-form', function () {
    $s = new S;

    $select = $s->select('owner')->creatable(
        [$s->text('gone')->when(false), $s->text('kept')],
        fn (array $data) => ['value' => '1', 'label' => 'x'],
    );

    $names = array_column(encodeWhen($select->toNode())['options']['create']['fields'], 'name');
    expect($names)->toBe(['kept']);
});

it('drops a when(false) filter from a table', function () {
    $s = new S;
    $table = (new TableBuilder('t'))->filters([
        $s->text('gone')->when(false),
        $s->text('kept'),
    ]);

    $names = array_column(encodeWhen($table->toNode())['options']['filters'], 'name');
    expect($names)->toBe(['kept']);
});

it('drops a when(false) action from every table action slot', function (string $method, string $key) {
    $s = new S;
    $table = (new TableBuilder('t'))->$method([
        $s->action('gone')->visit('/')->when(false),
        $s->action('kept')->visit('/'),
    ]);

    $names = array_column(encodeWhen($table->toNode())['options'][$key], 'name');
    expect($names)->toBe(['kept']);
})->with([
    ['rowActions', 'rowActions'],
    ['headerActions', 'headerActions'],
    ['bulkActions', 'bulkActions'],
]);

it('substitutes an empty container for a when(false) tab body', function () {
    $s = new S;

    $node = $s->tabs([['label' => 'One', 'body' => $s->text('gone')->when(false)]]);

    $tab = encodeWhen($node)['options']['tabs'][0];
    expect($tab['label'])->toBe('One')
        ->and($tab['body']['kind'])->toBe('stack')
        ->and($tab['body']['options']['children'])->toBe([]);
});

it('drops a when(false) action from a modal body', function () {
    $s = new S;

    $action = $s->action('open')->modal('T', $s->text('gone')->when(false));

    expect(encodeWhen($action)['options']['spec'])->not->toHaveKey('body');
});

it('drops a when(false) layout container whole, with its children', function () {
    $s = new S;

    $node = $s->stack([
        $s->section(['title' => 'Secret'], [$s->text('inner')])->when(false),
        $s->text('kept'),
    ]);

    $encoded = encodeWhen($node);
    expect($encoded['options']['children'])->toHaveCount(1)
        ->and(json_encode($encoded))->not->toContain('inner');
});

// ---------------------------------------------------------------------------
// The closure form, and the promise that when(true) changes nothing
// ---------------------------------------------------------------------------

it('treats a closure returning false like a literal false', function () {
    $s = new S;

    $node = $s->stack([$s->text('gone')->when(fn () => false), $s->text('kept')]);

    expect(array_column(encodeWhen($node)['options']['children'], 'name'))->toBe(['kept']);
});

it('resolves the when closure once per page assembly however often it is read', function () {
    $s = new S;
    $calls = 0;
    $field = $s->text('counted')->when(function () use (&$calls) {
        $calls++;

        return true;
    });

    $node = $s->stack([$field]);
    encodeWhen($node);
    encodeWhen($node);
    $field->isIncluded();

    expect($calls)->toBe(1);
});

it('serializes a when(true) node identically to one with no when at all', function () {
    $s = new S;

    $plain = $s->section(['title' => 'S'], [$s->text('a'), $s->action('go')->visit('/')]);
    $whenTrue = $s->section(['title' => 'S'], [
        $s->text('a')->when(true),
        $s->action('go')->visit('/')->when(true),
    ]);

    expect(json_encode($whenTrue))->toBe(json_encode($plain));
});

it('serializes a container whose children were all excluded as an empty list', function () {
    $s = new S;

    $node = $s->section(['title' => 'S'], [$s->text('gone')->when(false)]);

    expect(encodeWhen($node)['options']['children'])->toBe([]);
});

// ---------------------------------------------------------------------------
// The two traversers agree on what a child is
// ---------------------------------------------------------------------------
// A node can carry 'children' and 'fields' at once — the schema allows it and
// Field::set() reaches it. nestedChildren() used to stop at the first key
// present, so a 'fields' list behind a 'children' key was invisible to rule
// collection, defaults seeding and every walker built on it, while
// translatable() saw both.

it('walks both child list keys when a node carries children and fields', function () {
    $s = new S;
    $node = $s->repeater('outer')
        ->fields([$s->text('from_fields')])
        ->set('children', [$s->text('from_children')])
        ->toNode();

    $names = array_map(static fn (mixed $c) => $c->name, $node->nestedChildren());

    expect($node->options)->toHaveKeys(['children', 'fields'])
        ->and($names)->toEqualCanonicalizing(['from_fields', 'from_children']);
});

it('sees the same child set from both traversers', function () {
    $s = new S;
    $node = $s->repeater('outer')
        ->fields([$s->text('from_fields')])
        ->set('children', [$s->text('from_children')])
        ->toNode();

    $viaNested = array_map(static fn (mixed $c) => $c->name, $node->nestedChildren());

    // translatable() cascades over the same notion of "child"; the names it
    // reaches are the set nestedChildren() must also reach.
    $cascaded = $node->translatable();
    $viaTranslatable = [];
    foreach (['children', 'fields'] as $key) {
        foreach ($cascaded->options[$key] as $child) {
            $viaTranslatable[] = $child->name;
        }
    }

    expect($viaNested)->toEqualCanonicalizing($viaTranslatable);
});

// A builder converted with an explicit ->toNode() must carry its verdict onto
// the Node: containers filter Nodes, not builders, and this is how a field is
// placed into table filters and chart params.

it('carries the when verdict through an explicit toNode()', function () {
    $s = new S;

    $node = $s->stack([
        $s->text('gone')->when(false)->toNode(),
        $s->text('kept')->toNode(),
    ]);

    expect(array_column(encodeWhen($node)['options']['children'], 'name'))->toBe(['kept']);
});

it('keeps a hand-built Node reachable through when()', function () {
    $node = (new Node('customBlock', ['children' => []]))->when(false);

    expect($node->isIncluded())->toBeFalse()
        ->and(encodeWhen(new Node('row', ['children' => [$node]]))['options']['children'])->toBe([]);
});
