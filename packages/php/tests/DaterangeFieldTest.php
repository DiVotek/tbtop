<?php

use Tbtop\Admin\Dsl\Fields\Daterange;
use Tbtop\Admin\Dsl\S;

function encodeDaterange(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('Daterange: serializes with kind=daterange', function (): void {
    $field = Daterange::make('published_at');

    $json = encodeDaterange($field);

    expect($json['kind'])->toBe('daterange')
        ->and($json['name'])->toBe('published_at')
        ->and($json['options'])->toBe([])
        ->and($json['meta'])->toBe([]);
});

it('Daterange: S::makeField creates a Daterange instance', function (): void {
    $field = S::makeField('daterange', 'date_range');

    expect($field)->toBeInstanceOf(Daterange::class)
        ->and($field->name)->toBe('date_range');
});

it('Daterange: supports label and hiddenIf', function (): void {
    $field = Daterange::make('date_range')
        ->label('Date range')
        ->hiddenIf('published', '=', false);

    $json = encodeDaterange($field);

    expect($json['options']['label'])->toBe('Date range')
        ->and($json['meta'])->toHaveKey('hiddenIf');
});
