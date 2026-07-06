<?php

use Tbtop\Admin\Dsl\Fields\Boolean;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Fields\Text;
use Tbtop\Admin\Dsl\S;

function encodeTable(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('TableSerialization: table node carries options.filters as field nodes', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->filters([
            Select::make('status')->label('Status')->options([
                ['value' => 'draft', 'label' => 'Draft'],
                ['value' => 'published', 'label' => 'Published'],
            ]),
            Text::make('title')->label('Title'),
        ])
        ->query(fn () => null);

    $json = encodeTable($table->toNode());

    expect($json['options'])->toHaveKey('filters')
        ->and($json['options']['filters'])->toHaveCount(2)
        ->and($json['options']['filters'][0]['kind'])->toBe('select')
        ->and($json['options']['filters'][0]['name'])->toBe('status')
        ->and($json['options']['filters'][0]['options']['label'])->toBe('Status')
        ->and($json['options']['filters'][1]['kind'])->toBe('text')
        ->and($json['options']['filters'][1]['name'])->toBe('title');
});

it('TableSerialization: filtersIn defaults to modal when not set', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->filters([Text::make('q')])
        ->query(fn () => null);

    $json = encodeTable($table->toNode());

    expect($json['options']['filtersIn'])->toBe('modal');
});

it('TableSerialization: filtersIn inline serializes correctly', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->filters([Text::make('q')])
        ->filtersIn('inline')
        ->query(fn () => null);

    $json = encodeTable($table->toNode());

    expect($json['options']['filtersIn'])->toBe('inline');
});

it('TableSerialization: deferFilters emits true on wire', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->filters([Text::make('q')])
        ->deferFilters()
        ->query(fn () => null);

    $json = encodeTable($table->toNode());

    expect($json['options']['deferFilters'])->toBeTrue();
});

it('TableSerialization: filtersFormColumns emits the column count', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->filters([Text::make('q')])
        ->filtersFormColumns(2)
        ->query(fn () => null);

    $json = encodeTable($table->toNode());

    expect($json['options']['filtersFormColumns'])->toBe(2);
});

it('TableSerialization: filtersFormWidth emits the width string', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->filters([Text::make('q')])
        ->filtersFormWidth('lg')
        ->query(fn () => null);

    $json = encodeTable($table->toNode());

    expect($json['options']['filtersFormWidth'])->toBe('lg');
});

it('TableSerialization: filtersFormWidth rejects an invalid width', function (): void {
    (new S)->table('posts')->filtersFormWidth('xl');
})->throws(InvalidArgumentException::class);

it('TableSerialization: searchable serializes as list of column names', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->searchable(['title', 'slug'])
        ->query(fn () => null);

    $json = encodeTable($table->toNode());

    expect($json['options']['searchable'])->toBe(['title', 'slug']);
});

it('TableSerialization: filterUsing closure is absent from wire JSON', function (): void {
    $s = new S;
    $field = Boolean::make('with_media')
        ->label('Has media')
        ->filterUsing(fn ($q, $v) => $v ? $q->whereNotNull('cover') : $q);

    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->filters([$field])
        ->query(fn () => null);

    $json = encodeTable($table->toNode());
    $filterNode = $json['options']['filters'][0];

    expect($filterNode['kind'])->toBe('boolean')
        ->and($filterNode['options'])->not->toHaveKey('filterUsing')
        ->and($filterNode['meta'])->not->toHaveKey('filterUsing');
});

it('TableSerialization: table without filters has no filters key', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->query(fn () => null);

    $json = encodeTable($table->toNode());

    expect($json['options'])->not->toHaveKey('filters')
        ->and($json['options'])->not->toHaveKey('filtersIn');
});
