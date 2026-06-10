<?php

use Tbtop\Admin\Dsl\Fields\Radio;
use Tbtop\Admin\Dsl\Fields\Relation;
use Tbtop\Admin\Dsl\Fields\Richtext;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Fields\Slug;
use Tbtop\Admin\Dsl\Fields\Upload;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Tests\Fixtures\KitchenSinkPage;

function encodeModifier(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

// --- Select ---

it('FieldTypedModifiers: Select::options() serializes same as ->set(options, ...)', function () {
    $opts = [['value' => 'a', 'label' => 'A']];

    $viaSet = encodeModifier(Select::make('role')->set('options', $opts));
    $viaTyped = encodeModifier(Select::make('role')->options($opts));

    expect($viaTyped)->toBe($viaSet);
});

it('FieldTypedModifiers: Select::options() casts non-string values to strings on wire', function () {
    $json = encodeModifier(Select::make('author_id')->options([
        ['value' => 3, 'label' => 'a@b.c'],
        ['value' => '7', 'label' => 'd@e.f'],
    ]));

    expect($json['options']['options'])->toBe([
        ['value' => '3', 'label' => 'a@b.c'],
        ['value' => '7', 'label' => 'd@e.f'],
    ]);
});

it('FieldTypedModifiers: Radio::options() casts non-string values to strings on wire', function () {
    $json = encodeModifier(Radio::make('rating')->options([
        ['value' => 1, 'label' => 'One'],
    ]));

    expect($json['options']['options'])->toBe([
        ['value' => '1', 'label' => 'One'],
    ]);
});

it('FieldTypedModifiers: Select::searchable() serializes same as ->set(searchable, true)', function () {
    $viaSet = encodeModifier(Select::make('role')->set('searchable', true));
    $viaTyped = encodeModifier(Select::make('role')->searchable());

    expect($viaTyped)->toBe($viaSet);
});

// --- Slug ---

it('FieldTypedModifiers: Slug::fromField() serializes same as ->set(fromField, ...)', function () {
    $viaSet = encodeModifier(Slug::make('slug')->set('fromField', 'title'));
    $viaTyped = encodeModifier(Slug::make('slug')->fromField('title'));

    expect($viaTyped)->toBe($viaSet);
});

// --- Upload ---

it('FieldTypedModifiers: Upload::accept() serializes same as ->set(accept, ...)', function () {
    $viaSet = encodeModifier(Upload::make('photo')->set('accept', 'image/*'));
    $viaTyped = encodeModifier(Upload::make('photo')->accept('image/*'));

    expect($viaTyped)->toBe($viaSet);
});

it('FieldTypedModifiers: Upload::disk() serializes same as ->set(disk, ...)', function () {
    $viaSet = encodeModifier(Upload::make('photo')->set('disk', 's3'));
    $viaTyped = encodeModifier(Upload::make('photo')->disk('s3'));

    expect($viaTyped)->toBe($viaSet);
});

// --- Relation ---

it('FieldTypedModifiers: Relation::searchable() serializes same as ->set(searchable, true)', function () {
    $viaSet = encodeModifier(Relation::make('author')->set('searchable', true));
    $viaTyped = encodeModifier(Relation::make('author')->searchable());

    expect($viaTyped)->toBe($viaSet);
});

it('FieldTypedModifiers: Relation::labelKey() serializes same as ->set(labelKey, ...)', function () {
    $viaSet = encodeModifier(Relation::make('author')->set('labelKey', 'name'));
    $viaTyped = encodeModifier(Relation::make('author')->labelKey('name'));

    expect($viaTyped)->toBe($viaSet);
});

// --- Richtext ---

it('FieldTypedModifiers: Richtext::placeholder() serializes same as ->set(placeholder, ...)', function () {
    $viaSet = encodeModifier(Richtext::make('content')->set('placeholder', 'Type here…'));
    $viaTyped = encodeModifier(Richtext::make('content')->placeholder('Type here…'));

    expect($viaTyped)->toBe($viaSet);
});

// --- Kitchen-sink fixture unchanged ---

it('FieldTypedModifiers: kitchen-sink serialization still matches the committed fixture', function () {
    $fixturePath = __DIR__.'/../../contracts/fixtures/kitchen-sink.json';
    $s = new S;
    $tree = (new KitchenSinkPage)->view($s);
    $current = json_encode($tree, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    expect($current."\n")->toBe((string) file_get_contents($fixturePath));
});
