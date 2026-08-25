<?php

use Tbtop\Admin\Tests\Fixtures\CarModel;
use Tbtop\Admin\Tests\Fixtures\LocationModel;
use Tbtop\Admin\Tests\TableSortRelationHttpTestCase;

uses(TableSortRelationHttpTestCase::class);

function carNames(string $query): array
{
    return array_column(
        test()->getJson("/admin/cars/tables/cars?{$query}")->json('data.data'),
        'name',
    );
}

it('sorts a dot-path column by the related column, ascending', function (): void {
    $berlin = LocationModel::create(['name' => 'Berlin']);
    $amsterdam = LocationModel::create(['name' => 'Amsterdam']);
    CarModel::create(['name' => 'Car B', 'location_id' => $berlin->id]);
    CarModel::create(['name' => 'Car A', 'location_id' => $amsterdam->id]);

    // A plain orderBy('location.name') would error/ignore on sqlite — proves
    // the correlated-subquery resolver, not a raw column pass-through.
    expect(carNames('sort=location.name&dir=asc'))->toBe(['Car A', 'Car B']);
});

it('sorts a dot-path column by the related column, descending', function (): void {
    $berlin = LocationModel::create(['name' => 'Berlin']);
    $amsterdam = LocationModel::create(['name' => 'Amsterdam']);
    CarModel::create(['name' => 'Car B', 'location_id' => $berlin->id]);
    CarModel::create(['name' => 'Car A', 'location_id' => $amsterdam->id]);

    expect(carNames('sort=location.name&dir=desc'))->toBe(['Car B', 'Car A']);
});

it('sortBy() redirects the ORDER BY target to a different column', function (): void {
    // Insertion order is the inverse of price order, so a mutation that sorts
    // by the (nonexistent) "display_price" column instead of "price" — which
    // sqlite silently no-ops rather than erroring on — leaves rows in
    // insertion order and this assertion catches it.
    CarModel::create(['name' => 'Pricey', 'price' => 90]);
    CarModel::create(['name' => 'Cheap', 'price' => 10]);

    // Sorting the "display_price" column must order by "price", not by a
    // (nonexistent) "display_price" column.
    expect(carNames('sort=display_price&dir=asc'))->toBe(['Cheap', 'Pricey']);
});

it('sortUsing() receives the validated direction and its ordering is applied', function (): void {
    CarModel::create(['name' => 'Mid', 'price' => 50]);
    CarModel::create(['name' => 'NullPrice', 'price' => null]);
    CarModel::create(['name' => 'Low', 'price' => 10]);

    // The closure pins nulls last regardless of direction — only observable
    // if $direction actually reaches and drives the closure's own ordering.
    expect(carNames('sort=rank&dir=asc'))->toBe(['Low', 'Mid', 'NullPrice']);
    expect(carNames('sort=rank&dir=desc'))->toBe(['Mid', 'Low', 'NullPrice']);
});

it('keeps the related model global scopes in the sort subquery', function (): void {
    // Zebra > Aardvark, so a subquery that ignores SoftDeletes orders Car X
    // after Car Y; with the scope Car X sorts as NULL (first on sqlite asc).
    $zebra = LocationModel::create(['name' => 'Zebra']);
    $aardvark = LocationModel::create(['name' => 'Aardvark']);
    CarModel::create(['name' => 'Car X', 'location_id' => $zebra->id]);
    CarModel::create(['name' => 'Car Y', 'location_id' => $aardvark->id]);
    $zebra->delete();

    expect(carNames('sort=location.name&dir=asc'))->toBe(['Car X', 'Car Y']);
});
