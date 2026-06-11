<?php

use Tbtop\Admin\Dsl\S;

function encodeLayout(mixed $value): array
{
    return json_decode((string) json_encode($value), true);
}

// ---------------------------------------------------------------------------
// Bare row / stack — options must be identical to the pre-flex baseline
// ---------------------------------------------------------------------------

it('bare row serializes exactly as before (no flex keys on wire)', function () {
    $s = new S;
    $json = encodeLayout($s->row([$s->text('title')]));

    expect($json['kind'])->toBe('row')
        ->and($json['options'])->toHaveKey('children')
        ->and($json['options'])->not->toHaveKey('justify')
        ->and($json['options'])->not->toHaveKey('align')
        ->and($json['options'])->not->toHaveKey('gap')
        ->and($json['options'])->not->toHaveKey('wrap');
});

it('bare stack serializes exactly as before (no flex keys on wire)', function () {
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
// Row with flex options
// ---------------------------------------------------------------------------

it('row with justify serializes the justify option', function () {
    $s = new S;
    $json = encodeLayout($s->row([$s->text('a')])->justify('between'));

    expect($json['kind'])->toBe('row')
        ->and($json['options']['justify'])->toBe('between');
});

it('row with align serializes the align option', function () {
    $s = new S;
    $json = encodeLayout($s->row([$s->text('a')])->align('center'));

    expect($json['options']['align'])->toBe('center');
});

it('row with gap serializes the gap option', function () {
    $s = new S;
    $json = encodeLayout($s->row([$s->text('a')])->gap(6));

    expect($json['options']['gap'])->toBe(6);
});

it('row with wrap serializes wrap: true', function () {
    $s = new S;
    $json = encodeLayout($s->row([$s->text('a')])->wrap());

    expect($json['options']['wrap'])->toBeTrue();
});

it('row with all flex options set serializes all of them together', function () {
    $s = new S;
    $json = encodeLayout(
        $s->row([$s->text('a'), $s->text('b')])
            ->justify('between')
            ->align('center')
            ->gap(4)
            ->wrap()
    );

    expect($json['kind'])->toBe('row')
        ->and($json['options']['justify'])->toBe('between')
        ->and($json['options']['align'])->toBe('center')
        ->and($json['options']['gap'])->toBe(4)
        ->and($json['options']['wrap'])->toBeTrue()
        ->and($json['options']['children'])->toHaveCount(2);
});

// ---------------------------------------------------------------------------
// Stack with flex options
// ---------------------------------------------------------------------------

it('stack with gap serializes the gap option', function () {
    $s = new S;
    $json = encodeLayout($s->stack([$s->text('a')])->gap(6));

    expect($json['kind'])->toBe('stack')
        ->and($json['options']['gap'])->toBe(6);
});

it('stack with gap 0 serializes gap: 0', function () {
    $s = new S;
    $json = encodeLayout($s->stack([$s->text('a')])->gap(0));

    expect($json['options']['gap'])->toBe(0);
});

it('stack with justify and wrap serializes correctly', function () {
    $s = new S;
    $json = encodeLayout($s->stack([$s->text('a')])->justify('center')->wrap());

    expect($json['options']['justify'])->toBe('center')
        ->and($json['options']['wrap'])->toBeTrue();
});

// ---------------------------------------------------------------------------
// Invalid values throw
// ---------------------------------------------------------------------------

it('invalid justify value throws InvalidArgumentException', function () {
    $s = new S;
    $s->row([$s->text('a')])->justify('space-around');
})->throws(InvalidArgumentException::class);

it('invalid align value throws InvalidArgumentException', function () {
    $s = new S;
    $s->row([$s->text('a')])->align('top');
})->throws(InvalidArgumentException::class);

it('gap above 12 throws InvalidArgumentException', function () {
    $s = new S;
    $s->row([$s->text('a')])->gap(13);
})->throws(InvalidArgumentException::class);

it('negative gap throws InvalidArgumentException', function () {
    $s = new S;
    $s->row([$s->text('a')])->gap(-1);
})->throws(InvalidArgumentException::class);

// ---------------------------------------------------------------------------
// Chaining is immutable (each call returns a new builder)
// ---------------------------------------------------------------------------

it('flex methods return a new builder leaving the original unchanged', function () {
    $s = new S;
    $base = $s->row([$s->text('a')]);
    $withJustify = $base->justify('end');

    $baseJson = encodeLayout($base);
    $withJustifyJson = encodeLayout($withJustify);

    expect($baseJson['options'])->not->toHaveKey('justify')
        ->and($withJustifyJson['options']['justify'])->toBe('end');
});
