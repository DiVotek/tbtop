<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Dsl\Fields\InFilter;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Http\TableFilterApplier;

beforeEach(function () {
    Schema::create('products', function ($table): void {
        $table->id();
        $table->string('name');
        $table->string('category');
        $table->string('region');
    });
    DB::table('products')->insert([
        ['name' => 'Widget A', 'category' => 'tools',  'region' => 'eu'],
        ['name' => 'Widget B', 'category' => 'parts',  'region' => 'us'],
        ['name' => 'Gadget C', 'category' => 'tools',  'region' => 'apac'],
        ['name' => 'Gadget D', 'category' => 'safety', 'region' => 'eu'],
    ]);
});

afterEach(function () {
    Schema::dropIfExists('products');
});

// Multi-value selection returns only matched rows
it('InFilter: multi-value selection applies whereIn', function (): void {
    $builder = DB::table('products');
    $field = InFilter::make('category')->options([
        ['value' => 'tools',  'label' => 'Tools'],
        ['value' => 'parts',  'label' => 'Parts'],
        ['value' => 'safety', 'label' => 'Safety'],
    ]);
    TableFilterApplier::apply([$field], ['category' => ['tools', 'safety']], $builder);
    $rows = $builder->orderBy('name')->get();

    expect($rows->pluck('name')->all())->toBe(['Gadget C', 'Gadget D', 'Widget A']);
});

// Single-value scalar is wrapped and applied correctly
it('InFilter: scalar value is treated as single-element list', function (): void {
    $builder = DB::table('products');
    $field = InFilter::make('region')->options([
        ['value' => 'eu',   'label' => 'Europe'],
        ['value' => 'us',   'label' => 'US'],
        ['value' => 'apac', 'label' => 'APAC'],
    ]);
    TableFilterApplier::apply([$field], ['region' => 'us'], $builder);
    $rows = $builder->get();

    expect($rows->pluck('name')->all())->toBe(['Widget B']);
});

// Empty array skips filter — all rows returned
it('InFilter: empty array selection applies no filter', function (): void {
    $builder = DB::table('products');
    $field = InFilter::make('category')->options([
        ['value' => 'tools', 'label' => 'Tools'],
    ]);
    TableFilterApplier::apply([$field], ['category' => []], $builder);

    expect($builder->get()->count())->toBe(4);
});

// S factory produces an InFilter with correct wire kind
it('InFilter: S factory emits kind=in node with normalized options', function (): void {
    $s = new S;
    $field = $s->inFilter('category')->options([
        ['value' => 1, 'label' => 'One'],
        ['value' => 2, 'label' => 'Two'],
    ]);

    $node = json_decode(json_encode($field->toNode()), true);

    expect($node['kind'])->toBe('in')
        ->and($node['name'])->toBe('category')
        ->and($node['options']['options'][0]['value'])->toBe('1')
        ->and($node['options']['options'][1]['value'])->toBe('2');
});
