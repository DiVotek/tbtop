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
