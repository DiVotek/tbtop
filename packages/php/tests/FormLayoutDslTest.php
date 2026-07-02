<?php

use Tbtop\Admin\Dsl\Fields\Radio;
use Tbtop\Admin\Dsl\S;

function encodeLayoutNode(mixed $value): array
{
    return json_decode((string) json_encode($value), true);
}

// ---------------------------------------------------------------------------
// S::grid — breakpoint cols
// ---------------------------------------------------------------------------

it('grid with an int cols serializes unchanged (back-compat)', function () {
    $s = new S;
    $node = $s->grid(['cols' => 3], [$s->text('a')]);

    expect(encodeLayoutNode($node)['options']['cols'])->toBe(3);
});

it('grid with a breakpoint object cols serializes the object', function () {
    $s = new S;
    $node = $s->grid(['cols' => ['sm' => 1, 'md' => 2, 'lg' => 4]], [$s->text('a')]);

    expect(encodeLayoutNode($node)['options']['cols'])->toBe(['sm' => 1, 'md' => 2, 'lg' => 4]);
});

it('grid cols above 8 throws', function () {
    $s = new S;
    $s->grid(['cols' => 9], []);
})->throws(InvalidArgumentException::class);

it('grid cols with an invalid breakpoint key throws', function () {
    $s = new S;
    $s->grid(['cols' => ['xxl' => 2]], []);
})->throws(InvalidArgumentException::class);

// ---------------------------------------------------------------------------
// S::section — description / icon / aside / collapsible / columns
// ---------------------------------------------------------------------------

it('section serializes description, string icon, collapsible and columns', function () {
    $s = new S;
    $node = $s->section([
        'title' => 'Billing',
        'description' => 'Payment details',
        'icon' => 'credit-card',
        'collapsible' => true,
        'columns' => 2,
    ], [$s->text('card_number')]);

    $options = encodeLayoutNode($node)['options'];

    expect($options['title'])->toBe('Billing')
        ->and($options['description'])->toBe('Payment details')
        ->and($options['icon'])->toBe(['name' => 'credit-card', 'position' => 'left'])
        ->and($options['collapsible'])->toBeTrue()
        ->and($options['columns'])->toBe(2);
});

it('section preserves an explicit icon position object', function () {
    $s = new S;
    $node = $s->section(['icon' => ['name' => 'star', 'position' => 'right']], []);

    expect(encodeLayoutNode($node)['options']['icon'])->toBe(['name' => 'star', 'position' => 'right']);
});

it('section carries an aside child node', function () {
    $s = new S;
    $node = $s->section(['title' => 'Profile', 'aside' => $s->text('note')], [$s->text('name')]);

    $options = encodeLayoutNode($node)['options'];

    expect($options['aside']['name'])->toBe('note');
});

it('section without collapsible/columns omits both keys', function () {
    $s = new S;
    $node = $s->section(['title' => 'Plain'], [$s->text('x')]);

    $options = encodeLayoutNode($node)['options'];

    expect($options)->not->toHaveKey('collapsible')
        ->and($options)->not->toHaveKey('columns')
        ->and($options)->not->toHaveKey('aside');
});

it('section columns above 8 throws', function () {
    $s = new S;
    $s->section(['columns' => 12], []);
})->throws(InvalidArgumentException::class);

// ---------------------------------------------------------------------------
// S::tabs — per-tab columns
// ---------------------------------------------------------------------------

it('tab with children and columns wraps them in a grid body', function () {
    $s = new S;
    $node = $s->tabs([
        ['label' => 'Details', 'children' => [$s->text('a'), $s->text('b')], 'columns' => 2],
    ]);

    $body = encodeLayoutNode($node)['options']['tabs'][0]['body'];

    expect($body['kind'])->toBe('grid')
        ->and($body['options']['cols'])->toBe(2)
        ->and($body['options']['children'])->toHaveCount(2);
});

it('tab with children but no columns wraps them in a stack body', function () {
    $s = new S;
    $node = $s->tabs([
        ['label' => 'Details', 'children' => [$s->text('a')]],
    ]);

    $body = encodeLayoutNode($node)['options']['tabs'][0]['body'];

    expect($body['kind'])->toBe('stack');
});

it('tab combining body with children throws', function () {
    $s = new S;
    $s->tabs([
        ['label' => 'Bad', 'body' => $s->text('a'), 'children' => [$s->text('b')]],
    ]);
})->throws(InvalidArgumentException::class);

it('tab with neither body nor children throws', function () {
    $s = new S;
    $s->tabs([['label' => 'Empty']]);
})->throws(InvalidArgumentException::class);

// ---------------------------------------------------------------------------
// Field::columnSpan / columnStart
// ---------------------------------------------------------------------------

it('field columnSpan with an int serializes as colSpan', function () {
    $s = new S;
    $field = $s->text('title')->columnSpan(2);

    expect(encodeLayoutNode($field)['options']['colSpan'])->toBe(2);
});

it('field columnStart with a breakpoint object serializes as colStart', function () {
    $s = new S;
    $field = $s->text('title')->columnStart(['md' => 2]);

    expect(encodeLayoutNode($field)['options']['colStart'])->toBe(['md' => 2]);
});

it('field columnSpan above 8 throws', function () {
    $s = new S;
    $s->text('title')->columnSpan(9);
})->throws(InvalidArgumentException::class);

// ---------------------------------------------------------------------------
// Radio — descriptions / inline / boolean / disabled
// ---------------------------------------------------------------------------

it('Radio options carry per-option description and disabled', function () {
    $field = Radio::make('plan')->options([
        ['value' => 'free', 'label' => 'Free', 'description' => 'Basic tier'],
        ['value' => 'pro', 'label' => 'Pro', 'disabled' => true],
    ]);

    $options = encodeLayoutNode($field)['options']['options'];

    expect($options[0])->toBe(['value' => 'free', 'label' => 'Free', 'description' => 'Basic tier'])
        ->and($options[1])->toBe(['value' => 'pro', 'label' => 'Pro', 'disabled' => true]);
});

it('Radio inline() serializes inline: true', function () {
    $field = Radio::make('plan')->inline();

    expect(encodeLayoutNode($field)['options']['inline'])->toBeTrue();
});

it('Radio inline(false) serializes inline: false', function () {
    $field = Radio::make('plan')->inline(false);

    expect(encodeLayoutNode($field)['options']['inline'])->toBeFalse();
});

it('Radio boolean() sets Yes/No options', function () {
    $field = Radio::make('active')->boolean();

    expect(encodeLayoutNode($field)['options']['options'])->toBe([
        ['value' => '1', 'label' => 'Yes'],
        ['value' => '0', 'label' => 'No'],
    ]);
});

it('Radio boolean() does not override options already set', function () {
    $field = Radio::make('active')->options([
        ['value' => 'yes', 'label' => 'Yep'],
    ])->boolean();

    expect(encodeLayoutNode($field)['options']['options'])->toBe([
        ['value' => 'yes', 'label' => 'Yep'],
    ]);
});
