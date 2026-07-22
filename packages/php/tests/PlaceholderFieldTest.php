<?php

use Tbtop\Admin\Dsl\S;

it('serializes a text field with placeholder option', function () {
    $s = new S;
    $json = json_decode(json_encode($s->text('name')->placeholder('Full name…')), true);

    expect($json['options']['placeholder'])->toBe('Full name…');
});

it('serializes a textarea field with placeholder option', function () {
    $s = new S;
    $json = json_decode(json_encode($s->textarea('body')->placeholder('Write here…')), true);

    expect($json['options']['placeholder'])->toBe('Write here…');
});

it('serializes a number field with placeholder option', function () {
    $s = new S;
    $json = json_decode(json_encode($s->number('rating')->placeholder('0-10')), true);

    expect($json['options']['placeholder'])->toBe('0-10');
});

it('serializes a number field with a numeric step option', function () {
    $s = new S;
    $json = json_decode(json_encode($s->number('rating')->step(0.01)), true);

    expect($json['options']['step'])->toBe(0.01);
});

it('serializes a number field with step("any")', function () {
    $s = new S;
    $json = json_decode(json_encode($s->number('rating')->step('any')), true);

    expect($json['options']['step'])->toBe('any');
});

it('throws when Number::step() receives an invalid string', function () {
    $s = new S;

    expect(fn () => $s->number('rating')->step('whatever'))
        ->toThrow(InvalidArgumentException::class);
});
