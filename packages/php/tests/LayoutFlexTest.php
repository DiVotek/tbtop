<?php

use Tbtop\Admin\Dsl\S;

function encodeLayout(mixed $value): array
{
    return json_decode((string) json_encode($value), true);
}

// ---------------------------------------------------------------------------
// Bare row / stack — back to plain Node, no flex keys on wire
// ---------------------------------------------------------------------------

it('bare row serializes without flex keys', function () {
    $s = new S;
    $json = encodeLayout($s->row([$s->text('title')]));

    expect($json['kind'])->toBe('row')
        ->and($json['options'])->toHaveKey('children')
        ->and($json['options'])->not->toHaveKey('justify')
        ->and($json['options'])->not->toHaveKey('align')
        ->and($json['options'])->not->toHaveKey('gap')
        ->and($json['options'])->not->toHaveKey('wrap');
});

it('bare stack serializes without flex keys', function () {
    $s = new S;
    $json = encodeLayout($s->stack([$s->text('body')]));

    expect($json['kind'])->toBe('stack')
        ->and($json['options'])->toHaveKey('children')
        ->and($json['options'])->not->toHaveKey('justify')
        ->and($json['options'])->not->toHaveKey('align')
        ->and($json['options'])->not->toHaveKey('gap')
        ->and($json['options'])->not->toHaveKey('wrap');
});

// ---------------------------------------------------------------------------
// S::flex — serialization
// ---------------------------------------------------------------------------

it('flex with direction row serializes kind flex and direction row', function () {
    $s = new S;
    $json = encodeLayout($s->flex([$s->text('a')]));

    expect($json['kind'])->toBe('flex')
        ->and($json['options']['direction'])->toBe('row');
});

it('flex with direction col serializes direction col', function () {
    $s = new S;
    $json = encodeLayout($s->flex([$s->text('a')], direction: 'col'));

    expect($json['options']['direction'])->toBe('col');
});

it('flex with justify serializes the justify option', function () {
    $s = new S;
    $json = encodeLayout($s->flex([$s->text('a')], justify: 'between'));

    expect($json['options']['justify'])->toBe('between');
});

it('flex with align serializes the align option', function () {
    $s = new S;
    $json = encodeLayout($s->flex([$s->text('a')], align: 'center'));

    expect($json['options']['align'])->toBe('center');
});

it('flex with gap serializes the gap option', function () {
    $s = new S;
    $json = encodeLayout($s->flex([$s->text('a')], gap: 6));

    expect($json['options']['gap'])->toBe(6);
});

it('flex with wrap:true serializes wrap: true', function () {
    $s = new S;
    $json = encodeLayout($s->flex([$s->text('a')], wrap: true));

    expect($json['options']['wrap'])->toBeTrue();
});

it('flex with all options set serializes all of them', function () {
    $s = new S;
    $json = encodeLayout(
        $s->flex(
            [$s->text('a'), $s->text('b')],
            direction: 'row',
            justify: 'between',
            align: 'center',
            gap: 4,
            wrap: true,
        )
    );

    expect($json['kind'])->toBe('flex')
        ->and($json['options']['direction'])->toBe('row')
        ->and($json['options']['justify'])->toBe('between')
        ->and($json['options']['align'])->toBe('center')
        ->and($json['options']['gap'])->toBe(4)
        ->and($json['options']['wrap'])->toBeTrue()
        ->and($json['options']['children'])->toHaveCount(2);
});

it('flex omits justify when not set', function () {
    $s = new S;
    $json = encodeLayout($s->flex([$s->text('a')]));

    expect($json['options'])->not->toHaveKey('justify')
        ->and($json['options'])->not->toHaveKey('align')
        ->and($json['options'])->not->toHaveKey('gap')
        ->and($json['options'])->not->toHaveKey('wrap');
});

// ---------------------------------------------------------------------------
// S::flex — validation
// ---------------------------------------------------------------------------

it('invalid direction throws InvalidArgumentException', function () {
    $s = new S;
    $s->flex([$s->text('a')], direction: 'horizontal');
})->throws(InvalidArgumentException::class);

it('invalid justify throws InvalidArgumentException', function () {
    $s = new S;
    $s->flex([$s->text('a')], justify: 'space-around');
})->throws(InvalidArgumentException::class);

it('invalid align throws InvalidArgumentException', function () {
    $s = new S;
    $s->flex([$s->text('a')], align: 'top');
})->throws(InvalidArgumentException::class);

it('gap above 12 throws InvalidArgumentException', function () {
    $s = new S;
    $s->flex([$s->text('a')], gap: 13);
})->throws(InvalidArgumentException::class);

it('negative gap throws InvalidArgumentException', function () {
    $s = new S;
    $s->flex([$s->text('a')], gap: -1);
})->throws(InvalidArgumentException::class);
