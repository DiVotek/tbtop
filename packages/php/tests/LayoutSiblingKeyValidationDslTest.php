<?php

use Tbtop\Admin\Dsl\S;

function encodeSiblingNode(mixed $node): array
{
    return json_decode(json_encode($node), true);
}

/** @param  array<string, mixed>  $opts */
function siblingLayoutWithOptions(S $s, string $kind, array $opts): mixed
{
    $children = [$s->displayText('x')];

    return match ($kind) {
        'stack' => $s->stack($children, $opts),
        'row' => $s->row($children, $opts),
        'grid' => $s->grid(['cols' => 2, ...$opts], $children),
        'section' => $s->section(['title' => 'X', ...$opts], $children),
        'aside' => $s->aside($children, $opts),
        'collapsible' => $s->collapsible(['label' => 'X', ...$opts], $children),
    };
}

it('preserves the CMS responsive stack column span', function (): void {
    $s = new S;
    $json = encodeSiblingNode($s->stack(
        [$s->displayText('x')],
        ['colSpan' => ['sm' => 1, 'lg' => 2]],
    ));

    expect($json['options']['colSpan'])->toBe(['sm' => 1, 'lg' => 2]);
});

it('preserves column placement on option-array layout builders', function (string $kind): void {
    $json = encodeSiblingNode(siblingLayoutWithOptions(new S, $kind, [
        'colSpan' => ['sm' => 1, 'lg' => 2],
        'colStart' => ['md' => 2, 'xl' => 3],
    ]));

    expect($json['options']['colSpan'])->toBe(['sm' => 1, 'lg' => 2])
        ->and($json['options']['colStart'])->toBe(['md' => 2, 'xl' => 3]);
})->with(['stack', 'row', 'grid', 'section', 'aside', 'collapsible']);

it('rejects invalid layout column placement', function (string $key, mixed $value, string $message): void {
    expect(fn () => (new S)->stack([], [$key => $value]))
        ->toThrow(InvalidArgumentException::class, $message);
})->with([
    ['colSpan', 9, 'Invalid colSpan 9. Must be between 1 and 8.'],
    ['colStart', ['mobile' => 1], 'Invalid colStart breakpoint "mobile"'],
    ['colSpan', ['sm' => '2'], 'Invalid colSpan.sm: must be an integer.'],
]);

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
        'colSpan' => 2,
        'colStart' => ['lg' => 2],
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
        'colSpan' => 2,
        'colStart' => ['lg' => 2],
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
        'colSpan' => 2,
        'colStart' => ['lg' => 2],
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
        'colSpan' => 2,
        'colStart' => ['lg' => 2],
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
        'colSpan' => 2,
        'colStart' => ['lg' => 2],
        'id' => 'my-collapsible',
        'hidden' => false,
        'disabled' => false,
        'hiddenIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
        'disabledIf' => ['field' => 'a', 'op' => 'eq', 'value' => 'b'],
    ], [$s->displayText('x')]));

    expect($json['options']['label'])->toBe('Advanced options')
        ->and($json['meta']['id'])->toBe('my-collapsible');
});
