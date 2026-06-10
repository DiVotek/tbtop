<?php

use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\S;

function selectEncode(mixed $value): array
{
    return json_decode((string) json_encode($value), true);
}

it('Select: creatable serializes create.fields onto the wire; closure is absent', function () {
    $s = new S;
    $field = Select::make('author_id')
        ->creatable(
            fields: [
                $s->text('name')->label('Name')->required(),
            ],
            using: fn (array $validated): array => ['value' => '1', 'label' => 'New'],
        );

    $json = selectEncode($field);

    expect($json['kind'])->toBe('select')
        ->and($json['options'])->toHaveKey('create')
        ->and($json['options']['create'])->toHaveKey('fields')
        ->and($json['options']['create']['fields'])->toHaveCount(1)
        ->and($json['options']['create']['fields'][0]['kind'])->toBe('text')
        ->and($json['options']['create']['fields'][0]['name'])->toBe('name')
        // closure must NOT be on the wire
        ->and($json['options']['create'])->not->toHaveKey('using')
        ->and($json['options']['create'])->not->toHaveKey('closure');
});

it('Select: creatable exposes the using closure via creatableClosure() for server use', function () {
    $captured = null;
    $field = Select::make('author_id')
        ->creatable(
            fields: [],
            using: function (array $validated) use (&$captured): array {
                $captured = $validated;

                return ['value' => '42', 'label' => 'Test'];
            },
        );

    $closure = $field->creatableClosure();
    expect($closure)->toBeCallable();

    $result = $closure(['name' => 'Alice']);
    expect($result)->toBe(['value' => '42', 'label' => 'Test'])
        ->and($captured)->toBe(['name' => 'Alice']);
});
