<?php

use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\ColumnProjection;
use Tbtop\Admin\Tests\Fixtures\CarModel;
use Tbtop\Admin\Tests\Fixtures\LocationModel;

beforeEach(function (): void {
    Schema::create('locations', function ($table): void {
        $table->id();
        $table->string('name');
    });
    Schema::create('cars', function ($table): void {
        $table->id();
        $table->string('name');
        $table->foreignId('location_id')->nullable();
    });
});

function relationTable(): TableBuilder
{
    return (new TableBuilder('cars'))
        ->columns([
            Column::make('name')->kind('text'),
            Column::make('location.name')->kind('text'),
        ])
        ->query(fn () => CarModel::query());
}

// ---------------------------------------------------------------------------
// Dotted relation column on the Eloquent model path (the bug)
// ---------------------------------------------------------------------------

it('resolves a dotted relation column on the Eloquent model array path', function (): void {
    $loc = LocationModel::create(['name' => 'Berlin']);
    CarModel::create(['name' => 'A', 'location_id' => $loc->id]);

    // The client reads the flat key row['location.name']; the server must
    // resolve the nested relation value into that flat key.
    $result = ColumnProjection::apply(relationTable(), CarModel::with('location')->get());

    expect($result[0]['location.name'])->toBe('Berlin');
    // Serialized wire carries the flat key the client renders.
    expect(json_decode(json_encode($result[0]), true)['location.name'])->toBe('Berlin');
});

it('leaves the dotted relation key null when the related row is absent', function (): void {
    CarModel::create(['name' => 'Orphan', 'location_id' => null]);

    $result = ColumnProjection::apply(relationTable(), CarModel::with('location')->get());

    expect($result[0]['location.name'])->toBeNull();
});
