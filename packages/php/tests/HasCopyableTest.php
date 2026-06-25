<?php

use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\DisplayValueBlock;
use Tbtop\Admin\Dsl\Fields\Text;

it('Field: copyable serializes in options with defaults', function (): void {
    $json = json_decode(json_encode(Text::make('token')->copyable()), true);

    expect($json['options']['copyable'])->toBe(['message' => 'Copied', 'duration' => 2000]);
});

it('Field: copyable accepts custom message and duration', function (): void {
    $json = json_decode(json_encode(
        Text::make('token')->copyable('Token copied!', 1500)
    ), true);

    expect($json['options']['copyable'])->toBe(['message' => 'Token copied!', 'duration' => 1500]);
});

it('Field: without copyable omits the key', function (): void {
    $json = json_decode(json_encode(Text::make('token')), true);

    expect($json['options'])->not->toHaveKey('copyable');
});

it('Column: copyable serializes flat alongside icon/tooltip', function (): void {
    $json = json_decode(json_encode(Column::make('slug')->copyable('Slug copied!')), true);

    expect($json['copyable'])->toBe(['message' => 'Slug copied!', 'duration' => 2000]);
});

it('Column: without copyable omits the key', function (): void {
    $json = json_decode(json_encode(Column::make('slug')), true);

    expect($json)->not->toHaveKey('copyable');
});

it('DisplayValue: copyable serializes in options', function (): void {
    $json = json_decode(json_encode(DisplayValueBlock::make('TT-1042')->copyable()), true);

    expect($json['options']['copyable'])->toBe(['message' => 'Copied', 'duration' => 2000]);
});

it('Text: mask serializes in options', function (): void {
    $json = json_decode(json_encode(Text::make('phone')->mask('(999) 999-9999')), true);

    expect($json['options']['mask'])->toBe('(999) 999-9999');
});

it('Text: without mask omits the key', function (): void {
    $json = json_decode(json_encode(Text::make('phone')), true);

    expect($json['options'])->not->toHaveKey('mask');
});
