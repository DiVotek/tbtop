<?php

use Tbtop\Admin\Dsl\Fields\MediaPicker;
use Tbtop\Admin\Dsl\S;

function encodeMediaField(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('MediaField: kind is media', function () {
    $json = encodeMediaField(MediaPicker::make('cover'));

    expect($json['kind'])->toBe('media')
        ->and($json['name'])->toBe('cover');
});

it('MediaField: ->multiple() sets multiple option', function () {
    $json = encodeMediaField(MediaPicker::make('images')->multiple());

    expect($json['options']['multiple'])->toBeTrue();
});

it('MediaField: ->multiple(false) sets multiple to false', function () {
    $json = encodeMediaField(MediaPicker::make('cover')->multiple(false));

    expect($json['options']['multiple'])->toBeFalse();
});

it('MediaField: ->accept() sets accept array', function () {
    $json = encodeMediaField(MediaPicker::make('docs')->accept(['image/*', 'application/pdf']));

    expect($json['options']['accept'])->toBe(['image/*', 'application/pdf']);
});

it('MediaField: S::media() dispatches to MediaPicker', function () {
    $s = new S;
    $field = $s->media('cover');

    expect($field)->toBeInstanceOf(MediaPicker::class);
    expect(encodeMediaField($field)['kind'])->toBe('media');
});

it('MediaField: media is in BUILT_IN_KINDS', function () {
    expect(S::BUILT_IN_KINDS)->toContain('media');
});

it('MediaField: ->variant() sets variant option', function () {
    $json = encodeMediaField(MediaPicker::make('cover')->variant('preview'));

    expect($json['options']['variant'])->toBe('preview');
});

it('MediaField: variant is absent by default (inline)', function () {
    $json = encodeMediaField(MediaPicker::make('cover'));

    expect($json['options'])->not->toHaveKey('variant');
});
