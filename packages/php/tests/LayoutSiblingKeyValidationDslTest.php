<?php

use Tbtop\Admin\Dsl\S;

function encodeSiblingNode(mixed $node): array
{
    return json_decode(json_encode($node), true);
}

// ---------------------------------------------------------------------------
// stack() unknown option keys
// ---------------------------------------------------------------------------

it('stack with an unknown option key throws', function (): void {
    $s = new S;
    $s->stack([$s->displayText('x')], ['bogus' => 'nope']);
})->throws(InvalidArgumentException::class, 'Unknown stack option "bogus"');

it('stack accepts every whitelisted option key', function (): void {
    $s = new S;
    $json = encodeSiblingNode($s->stack([$s->displayText('x')], [
        'class' => 'shadow-lg',
        'gap' => 4,
        'id' => 'my-stack',
        'hidden' => false,
        'disabled' => false,
        'hiddenIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
        'disabledIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
    ]));

    expect($json['options']['class'])->toBe('shadow-lg')
        ->and($json['options']['gap'])->toBe(4)
        ->and($json['meta']['id'])->toBe('my-stack');
});

// ---------------------------------------------------------------------------
// row() unknown option keys
// ---------------------------------------------------------------------------

it('row with an unknown option key throws', function (): void {
    $s = new S;
    $s->row([$s->displayText('x')], ['bogus' => 'nope']);
})->throws(InvalidArgumentException::class, 'Unknown row option "bogus"');

it('row accepts every whitelisted option key', function (): void {
    $s = new S;
    $json = encodeSiblingNode($s->row([$s->displayText('x')], [
        'class' => 'shadow-lg',
        'gap' => 4,
        'id' => 'my-row',
        'hidden' => false,
        'disabled' => false,
        'hiddenIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
        'disabledIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
    ]));

    expect($json['options']['class'])->toBe('shadow-lg')
        ->and($json['options']['gap'])->toBe(4)
        ->and($json['meta']['id'])->toBe('my-row');
});

// ---------------------------------------------------------------------------
// aside() unknown option keys
// ---------------------------------------------------------------------------

it('aside with an unknown option key throws', function (): void {
    $s = new S;
    $s->aside([$s->displayText('x')], ['bogus' => 'nope']);
})->throws(InvalidArgumentException::class, 'Unknown aside option "bogus"');

it('aside accepts every whitelisted option key', function (): void {
    $s = new S;
    $json = encodeSiblingNode($s->aside([$s->displayText('x')], [
        'class' => 'shadow-lg',
        'id' => 'my-aside',
        'hidden' => false,
        'disabled' => false,
        'hiddenIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
        'disabledIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
    ]));

    expect($json['options']['class'])->toBe('shadow-lg')
        ->and($json['meta']['id'])->toBe('my-aside');
});

// ---------------------------------------------------------------------------
// grid() unknown option keys
// ---------------------------------------------------------------------------

it('grid with an unknown option key throws', function (): void {
    $s = new S;
    $s->grid(['bogus' => 'nope'], [$s->displayText('x')]);
})->throws(InvalidArgumentException::class, 'Unknown grid option "bogus"');

it('grid accepts every whitelisted option key', function (): void {
    $s = new S;
    $json = encodeSiblingNode($s->grid([
        'cols' => 2,
        'gap' => 4,
        'class' => 'shadow-lg',
        'id' => 'my-grid',
        'hidden' => false,
        'disabled' => false,
        'hiddenIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
        'disabledIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
    ], [$s->displayText('x')]));

    expect($json['options']['cols'])->toBe(2)
        ->and($json['meta']['id'])->toBe('my-grid');
});

// ---------------------------------------------------------------------------
// collapsible() unknown option keys
// ---------------------------------------------------------------------------

it('collapsible with an unknown option key throws', function (): void {
    $s = new S;
    $s->collapsible(['label' => 'X', 'bogus' => 'nope'], [$s->displayText('x')]);
})->throws(InvalidArgumentException::class, 'Unknown collapsible option "bogus"');

it('collapsible accepts every whitelisted option key', function (): void {
    $s = new S;
    $json = encodeSiblingNode($s->collapsible([
        'label' => 'Advanced options',
        'collapsed' => true,
        'id' => 'my-collapsible',
        'hidden' => false,
        'disabled' => false,
        'hiddenIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
        'disabledIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
    ], [$s->displayText('x')]));

    expect($json['options']['label'])->toBe('Advanced options')
        ->and($json['meta']['id'])->toBe('my-collapsible');
});
