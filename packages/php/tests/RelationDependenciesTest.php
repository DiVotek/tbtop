<?php

use Opis\JsonSchema\Validator;
use Tbtop\Admin\Dsl\Fields\Relation;

function encodeRelation(Relation $field): array
{
    return json_decode(json_encode($field), true);
}

it('RelationDependencies: dependsOn() serializes the parent field list', function (): void {
    $single = encodeRelation(Relation::make('city_id')->dependsOn('country_id'));
    expect($single['options']['dependsOn'])->toBe(['country_id']);

    $multi = encodeRelation(Relation::make('city_id')->dependsOn(['country_id', 'region_id']));
    expect($multi['options']['dependsOn'])->toBe(['country_id', 'region_id']);
});

it('RelationDependencies: keepValueOnParentChange() emits only when keeping', function (): void {
    $kept = encodeRelation(Relation::make('city_id')->dependsOn('country_id')->keepValueOnParentChange());
    expect($kept['options']['keepValue'])->toBeTrue();

    $reset = encodeRelation(Relation::make('city_id')->dependsOn('country_id')->keepValueOnParentChange(false));
    expect($reset['options'])->not->toHaveKey('keepValue');
});

it('RelationDependencies: whenParentEmpty() emits only the non-default mode', function (): void {
    $empty = encodeRelation(Relation::make('city_id')->dependsOn('country_id')->whenParentEmpty('empty'));
    expect($empty['options']['whenParentEmpty'])->toBe('empty');

    $disabled = encodeRelation(Relation::make('city_id')->dependsOn('country_id')->whenParentEmpty('disabled'));
    expect($disabled['options'])->not->toHaveKey('whenParentEmpty');
});

it('RelationDependencies: whenParentEmpty() rejects unknown modes', function (): void {
    Relation::make('city_id')->whenParentEmpty('sometimes');
})->throws(InvalidArgumentException::class);

it('RelationDependencies: dependsOnFields() reads the declared parents', function (): void {
    expect(Relation::make('user_id')->dependsOn(['city_id'])->dependsOnFields())->toBe(['city_id']);
    expect(Relation::make('user_id')->dependsOnFields())->toBe([]);
});

it('RelationDependencies: query() closure receives parent values as deps', function (): void {
    $field = Relation::make('user_id')->query(fn (array $deps) => $deps['city_id'] ?? null);
    $closure = $field->queryClosure();

    expect($closure(['city_id' => '7']))->toBe('7');
});

it('RelationDependencies: a dependent relation conforms to the wire schema', function (): void {
    $node = json_decode(json_encode(
        Relation::make('city_id')->label('City')
            ->dependsOn('country_id')
            ->whenParentEmpty('empty')
            ->keepValueOnParentChange()
            ->searchable()
            ->labelKey('name'),
    ));

    $validator = new Validator;
    $schema = json_decode((string) file_get_contents(__DIR__.'/../../contracts/structure.schema.json'));
    $validator->resolver()?->registerRaw($schema);
    $result = $validator->validate($node, $schema->{'$id'});

    expect($result->isValid())->toBeTrue();
});
