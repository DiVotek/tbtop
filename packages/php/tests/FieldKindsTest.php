<?php

use Tbtop\Admin\Dsl\Fields\CheckboxList;
use Tbtop\Admin\Dsl\Fields\Slider;
use Tbtop\Admin\Dsl\Fields\ToggleButtons;

function encodeFieldKind(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

// --- CheckboxList ---

it('FieldKinds: CheckboxList::options() string-casts option values on the wire', function () {
    $json = encodeFieldKind(CheckboxList::make('tags')->options([
        ['value' => 1, 'label' => 'One'],
        ['value' => '2', 'label' => 'Two'],
    ]));

    expect($json['kind'])->toBe('checkboxlist');
    expect($json['options']['options'])->toBe([
        ['value' => '1', 'label' => 'One'],
        ['value' => '2', 'label' => 'Two'],
    ]);
});

// --- ToggleButtons ---

it('FieldKinds: ToggleButtons defaults to single (no multiple flag emitted)', function () {
    $json = encodeFieldKind(ToggleButtons::make('visibility')->options([
        ['value' => 'public', 'label' => 'Public'],
    ]));

    expect($json['kind'])->toBe('togglebuttons');
    expect($json['options'])->not->toHaveKey('multiple');
});

it('FieldKinds: ToggleButtons::multiple() emits multiple:true', function () {
    $json = encodeFieldKind(ToggleButtons::make('channels')->multiple());

    expect($json['options']['multiple'])->toBeTrue();
    expect(ToggleButtons::make('channels')->multiple()->isMultiple())->toBeTrue();
});

// --- Slider ---

it('FieldKinds: Slider::min/max/step set the structural wire keys', function () {
    $json = encodeFieldKind(Slider::make('score')->min(0)->max(10)->step(1));

    expect($json['kind'])->toBe('slider');
    expect($json['options']['min'])->toBe(0);
    expect($json['options']['max'])->toBe(10);
    expect($json['options']['step'])->toBe(1);
});

it('FieldKinds: Slider rules min/max mirror into wire constraints', function () {
    $json = encodeFieldKind(Slider::make('score')->rules('min:0|max:10'));

    expect($json['options']['constraints'])->toBe(['min' => 0, 'max' => 10]);
});
