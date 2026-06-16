<?php

use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\S;

function encodeSelect(mixed $value): array
{
    return json_decode((string) json_encode($value), true);
}

it('Select: multiple() sets options.multiple to true on the wire node', function () {
    $json = encodeSelect(
        Select::make('tags')->options([
            ['value' => 'php', 'label' => 'PHP'],
            ['value' => 'js', 'label' => 'JavaScript'],
        ])->multiple()
    );

    expect($json['kind'])->toBe('select')
        ->and($json['options']['multiple'])->toBeTrue();
});

it('Select: multiple(false) sets options.multiple to false', function () {
    $json = encodeSelect(Select::make('tags')->multiple(false));

    expect($json['options']['multiple'])->toBeFalse();
});

it('Select: without multiple() the wire node omits the multiple key', function () {
    $json = encodeSelect(Select::make('role')->options([
        ['value' => 'admin', 'label' => 'Admin'],
    ]));

    expect($json['options'])->not->toHaveKey('multiple');
});

it('Select: multiple() is chainable and returns static', function () {
    $s = new S;
    $field = $s->select('x')->multiple()->options([['value' => 'a', 'label' => 'A']]);
    $json = encodeSelect($field);

    expect($json['options']['multiple'])->toBeTrue()
        ->and($json['options']['options'][0]['value'])->toBe('a');
});

it('Select: multiple() and creatable() coexist on the wire node', function () {
    $s = new S;
    $field = Select::make('categories')
        ->multiple()
        ->creatable(
            fields: [$s->text('name')->label('Name')->required()],
            using: fn (array $v): array => ['value' => '1', 'label' => 'New'],
        );

    $json = encodeSelect($field);

    expect($json['options']['multiple'])->toBeTrue()
        ->and($json['options'])->toHaveKey('create')
        ->and($json['options']['create']['fields'])->toHaveCount(1);
});
