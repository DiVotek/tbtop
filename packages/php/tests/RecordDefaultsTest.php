<?php

use Tbtop\Admin\Dsl\S;

it('seeds defaults into absent keys and leaves supplied ones alone', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->text('absent')->default('seeded'),
        $s->text('explicit_null')->default('seeded'),
        $s->text('explicit_empty')->default('seeded'),
        $s->text('filled')->default('seeded'),
    ])->record([
        'explicit_null' => null,
        'explicit_empty' => '',
        'filled' => 'from record',
    ]);

    expect($form->recordData())->toBe([
        'explicit_null' => null,
        'explicit_empty' => '',
        'filled' => 'from record',
        'absent' => 'seeded',
    ]);
});

it('pads repeater rows to defaultItems and keeps extra content rows', function () {
    $s = new S;
    $padded = $s->form('a', [
        $s->repeater('rows')->fields([$s->text('q')])->defaultItems(3)->default([['q' => 1]]),
    ]);
    $overflowing = $s->form('b', [
        $s->repeater('rows')->fields([$s->text('q')])->defaultItems(1)->default([['q' => 1], ['q' => 2]]),
    ]);

    expect(json_decode(json_encode($padded->recordData()), true))
        ->toBe(['rows' => [['q' => 1], [], []]])
        ->and(json_decode(json_encode($overflowing->recordData()), true))
        ->toBe(['rows' => [['q' => 1], ['q' => 2]]]);
});

it('does not seed repeater rows when the record already carries the key', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->repeater('rows')->fields([$s->text('q')])->defaultItems(3),
    ])->record(['rows' => [['q' => 9]]]);

    expect($form->recordData())->toBe(['rows' => [['q' => 9]]]);
});

it('serializes padded repeater rows as objects, not arrays', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->repeater('rows')->fields([$s->text('q')])->defaultItems(2),
    ]);

    expect(json_encode($form->recordData()))->toBe('{"rows":[{},{}]}');
});

it('expands a scalar default on a translatable field into a locale map', function () {
    $s = new S;
    $form = $s->form('post', [
        $s->text('title')->translatable()->default('Hello'),
    ]);

    $locale = config('tbtop-admin.default_content_locale') ?: 'en';

    expect($form->recordData()['title'])->toBeArray()->toHaveKey($locale, 'Hello');
});
