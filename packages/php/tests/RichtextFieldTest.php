<?php

use Tbtop\Admin\Dsl\S;

it('serializes a richtext field to wire shape with kind=richtext', function () {
    $s = new S;
    $json = json_decode(json_encode($s->richtext('body')->label('Body')), true);

    expect($json['kind'])->toBe('richtext')
        ->and($json['name'])->toBe('body')
        ->and($json['options']['label'])->toBe('Body');
});

it('serializes a richtext field with placeholder option', function () {
    $s = new S;
    $json = json_decode(json_encode($s->richtext('body')->set('placeholder', 'Write here…')), true);

    expect($json['options']['placeholder'])->toBe('Write here…');
});

it('richtext field without explicit rules gets the nullable baseline', function () {
    $s = new S;
    $form = $s->form('post', [$s->richtext('body')]);

    expect($form->collectRules())->toBe(['body' => ['nullable']]);
});

it('richtext field with required() emits the required rule', function () {
    $s = new S;
    $form = $s->form('post', [$s->richtext('body')->required()]);

    expect($form->collectRules())->toBe(['body' => ['required']]);
});
