<?php

use Tbtop\Admin\Dsl\S;

function encodeClassGapNode(mixed $value): array
{
    return json_decode((string) json_encode($value), true);
}

// ---------------------------------------------------------------------------
// options.class — generic escape hatch on stack/flex/grid/section/aside
// ---------------------------------------------------------------------------

it('stack serializes options.class when passed in opts', function () {
    $s = new S;
    $json = encodeClassGapNode($s->stack([$s->text('a')], ['class' => 'gap-6']));

    expect($json['options']['class'])->toBe('gap-6');
});

it('stack without class omits it from the wire', function () {
    $s = new S;
    $json = encodeClassGapNode($s->stack([$s->text('a')]));

    expect($json['options'])->not->toHaveKey('class');
});

it('flex serializes options.class from the trailing named parameter', function () {
    $s = new S;
    $json = encodeClassGapNode($s->flex([$s->text('a')], class: 'bg-muted'));

    expect($json['options']['class'])->toBe('bg-muted');
});

it('flex without class omits it from the wire', function () {
    $s = new S;
    $json = encodeClassGapNode($s->flex([$s->text('a')]));

    expect($json['options'])->not->toHaveKey('class');
});

it('grid serializes options.class when passed in opts', function () {
    $s = new S;
    $json = encodeClassGapNode($s->grid(['cols' => 3, 'class' => 'bg-card'], [$s->text('a')]));

    expect($json['options']['class'])->toBe('bg-card');
});

it('section serializes options.class when passed in opts', function () {
    $s = new S;
    $json = encodeClassGapNode($s->section(['title' => 'X', 'class' => 'shadow-lg'], [$s->text('a')]));

    expect($json['options']['class'])->toBe('shadow-lg');
});

it('aside serializes options.class when passed in opts', function () {
    $s = new S;
    $json = encodeClassGapNode($s->aside([$s->text('a')], ['class' => 'w-96']));

    expect($json['kind'])->toBe('aside')
        ->and($json['options']['class'])->toBe('w-96');
});

it('aside without opts omits class from the wire (back-compat)', function () {
    $s = new S;
    $json = encodeClassGapNode($s->aside([$s->text('a')]));

    expect($json['options'])->not->toHaveKey('class');
});

// ---------------------------------------------------------------------------
// S::grid — gap option (0-12, default 4 client-side, reuses the flex scale)
// ---------------------------------------------------------------------------

it('grid serializes options.gap when passed in opts', function () {
    $s = new S;
    $json = encodeClassGapNode($s->grid(['cols' => 2, 'gap' => 6], [$s->text('a')]));

    expect($json['options']['gap'])->toBe(6);
});

it('grid without gap omits it from the wire (client defaults to 4)', function () {
    $s = new S;
    $json = encodeClassGapNode($s->grid(['cols' => 2], [$s->text('a')]));

    expect($json['options'])->not->toHaveKey('gap');
});

it('grid gap above 12 throws InvalidArgumentException', function () {
    $s = new S;
    $s->grid(['cols' => 2, 'gap' => 99], [$s->text('a')]);
})->throws(InvalidArgumentException::class);

it('grid negative gap throws InvalidArgumentException', function () {
    $s = new S;
    $s->grid(['cols' => 2, 'gap' => -1], [$s->text('a')]);
})->throws(InvalidArgumentException::class);
