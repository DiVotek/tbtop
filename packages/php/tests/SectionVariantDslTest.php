<?php

use Tbtop\Admin\Dsl\S;

function encodeVariantNode(mixed $node): array
{
    return json_decode(json_encode($node), true);
}

// ---------------------------------------------------------------------------
// Section variants
// ---------------------------------------------------------------------------

it('section variant card serializes options.variant', function (): void {
    $s = new S;
    $json = encodeVariantNode($s->section(
        ['title' => 'Recently updated', 'variant' => 'card', 'action' => ['label' => 'Open', 'url' => '/x']],
        [$s->displayText('...')],
    ));

    expect($json['options']['variant'])->toBe('card')
        ->and($json['options']['title'])->toBe('Recently updated')
        ->and($json['options']['action'])->toBe(['label' => 'Open', 'url' => '/x']);
});

it('section variant plain serializes options.variant', function (): void {
    $s = new S;
    $json = encodeVariantNode($s->section(['title' => 'Browse', 'variant' => 'plain'], []));

    expect($json['options']['variant'])->toBe('plain');
});

it('section without variant emits no variant key (back-compat)', function (): void {
    $s = new S;
    $json = encodeVariantNode($s->section(['title' => 'Plain old'], []));

    expect($json['options'])->not->toHaveKey('variant');
});

it('section with an invalid variant throws', function (): void {
    (new S)->section(['title' => 'X', 'variant' => 'fancy'], []);
})->throws(InvalidArgumentException::class);

// ---------------------------------------------------------------------------
// section unknown option keys
// ---------------------------------------------------------------------------

it('section with an unknown option key throws', function (): void {
    (new S)->section(['title' => 'X', 'bogus' => 'nope'], []);
})->throws(InvalidArgumentException::class, 'Unknown section option "bogus"');

it('section with label instead of title throws a did-you-mean hint', function (): void {
    (new S)->section(['label' => 'X'], []);
})->throws(InvalidArgumentException::class, "Did you mean 'title'?");

it('section accepts every whitelisted option key', function (): void {
    $s = new S;
    $json = encodeVariantNode($s->section([
        'title' => 'X',
        'description' => 'desc',
        'icon' => 'star',
        'aside' => $s->displayText('note'),
        'collapsible' => true,
        'collapsed' => false,
        'columns' => 2,
        'action' => ['label' => 'Open', 'url' => '/x'],
        'variant' => 'card',
        'class' => 'shadow-lg',
        'id' => 'my-section',
        'hidden' => false,
        'disabled' => false,
        'hiddenIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
        'disabledIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
    ], []));

    expect($json['options']['title'])->toBe('X')
        ->and($json['meta']['id'])->toBe('my-section');
});

// ---------------------------------------------------------------------------
// actionsRow grid variant
// ---------------------------------------------------------------------------

it('actionsRow grid variant serializes options.variant on the row node', function (): void {
    $s = new S;
    $json = encodeVariantNode($s->actionsRow(
        [$s->action('pages')->label('Pages')->visit('/admin/pages')],
        ['variant' => 'grid'],
    ));

    expect($json['kind'])->toBe('row')
        ->and($json['options']['variant'])->toBe('grid')
        ->and($json['options']['children'])->toHaveCount(1);
});

it('actionsRow without variant emits no variant key (back-compat)', function (): void {
    $s = new S;
    $json = encodeVariantNode($s->actionsRow([$s->action('a')->label('A')->visit('/a')]));

    expect($json['options'])->not->toHaveKey('variant');
});

it('actionsRow with an invalid variant throws', function (): void {
    $s = new S;
    $s->actionsRow([$s->action('a')->label('A')->visit('/a')], ['variant' => 'masonry']);
})->throws(InvalidArgumentException::class);
