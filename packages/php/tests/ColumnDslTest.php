<?php

use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\S;

function encodeColumn(Column $col): array
{
    return json_decode(json_encode($col), true);
}

// ---------------------------------------------------------------------------
// Basic serialization
// ---------------------------------------------------------------------------

it('Column: make + label + kind serializes minimal wire shape', function (): void {
    $json = encodeColumn(Column::make('title')->label('Title')->kind('text'));

    expect($json['name'])->toBe('title')
        ->and($json['label'])->toBe('Title')
        ->and($json['kind'])->toBe('text');
});

it('Column: defaults are omitted from wire (sparse serialization)', function (): void {
    $json = encodeColumn(Column::make('title'));

    // Only name must be present; flags with a default value are omitted
    expect($json)->toHaveKey('name')
        ->and($json)->not->toHaveKey('sortable')
        ->and($json)->not->toHaveKey('searchable')
        ->and($json)->not->toHaveKey('toggleable')
        ->and($json)->not->toHaveKey('hiddenByDefault')
        ->and($json)->not->toHaveKey('align')
        ->and($json)->not->toHaveKey('wrap')
        ->and($json)->not->toHaveKey('translatable');
});

it('Column: sortable emits true on wire', function (): void {
    $json = encodeColumn(Column::make('views')->sortable());
    expect($json['sortable'])->toBeTrue();
});

it('Column: searchable emits true on wire', function (): void {
    $json = encodeColumn(Column::make('title')->searchable());
    expect($json['searchable'])->toBeTrue();
});

it('Column: toggleable with hiddenByDefault emits both flags', function (): void {
    $json = encodeColumn(Column::make('meta')->toggleable(true, true));

    expect($json['toggleable'])->toBeTrue()
        ->and($json['hiddenByDefault'])->toBeTrue();
});

it('Column: align center emits align', function (): void {
    $json = encodeColumn(Column::make('status')->align('center'));
    expect($json['align'])->toBe('center');
});

it('Column: icon emits name + position', function (): void {
    $json = encodeColumn(Column::make('status')->icon('check', 'left'));
    expect($json['icon'])->toBe(['name' => 'check', 'position' => 'left']);
});

it('Column: width emits string', function (): void {
    $json = encodeColumn(Column::make('views')->width('200px'));
    expect($json['width'])->toBe('200px');
});

it('Column: wrap emits wrap:true', function (): void {
    $json = encodeColumn(Column::make('body')->wrap());
    expect($json['wrap'])->toBeTrue();
});

it('Column: truncate emits wrap:false', function (): void {
    $json = encodeColumn(Column::make('body')->truncate());
    expect($json['wrap'])->toBeFalse();
});

it('Column: tooltip emits tooltip string', function (): void {
    $json = encodeColumn(Column::make('views')->tooltip('Total views'));
    expect($json['tooltip'])->toBe('Total views');
});

it('Column: translatable emits translatable:true', function (): void {
    $json = encodeColumn(Column::make('title')->translatable());
    expect($json['translatable'])->toBeTrue();
});

// ---------------------------------------------------------------------------
// Kind sugar
// ---------------------------------------------------------------------------

it('Column: date() sets kind=date and emits format', function (): void {
    $json = encodeColumn(Column::make('created_at')->date('Y-m-d'));

    expect($json['kind'])->toBe('date')
        ->and($json['format'])->toBe('Y-m-d');
});

it('Column: datetime() sets kind=datetime', function (): void {
    $json = encodeColumn(Column::make('updated_at')->datetime('Y-m-d H:i'));

    expect($json['kind'])->toBe('datetime')
        ->and($json['format'])->toBe('Y-m-d H:i');
});

it('Column: number() sets kind=number and decimals', function (): void {
    $json = encodeColumn(Column::make('amount')->number(2));

    expect($json['kind'])->toBe('number')
        ->and($json['decimals'])->toBe(2);
});

it('Column: money() sets kind=money and currency', function (): void {
    $json = encodeColumn(Column::make('price')->money('USD'));

    expect($json['kind'])->toBe('money')
        ->and($json['currency'])->toBe('USD');
});

it('Column: boolean() sets kind=boolean with icon and color params', function (): void {
    $json = encodeColumn(
        Column::make('published')->boolean('check', 'x', Color::Success, Color::Gray)
    );

    expect($json['kind'])->toBe('boolean')
        ->and($json['boolean']['trueIcon'])->toBe('check')
        ->and($json['boolean']['falseIcon'])->toBe('x')
        ->and($json['boolean']['trueColor'])->toBe('success')
        ->and($json['boolean']['falseColor'])->toBe('gray');
});

it('Column: badge() sets kind=badge with colors map', function (): void {
    $json = encodeColumn(
        Column::make('status')->badge(['draft' => 'gray', 'published' => 'success'])
    );

    expect($json['kind'])->toBe('badge')
        ->and($json['badge']['colors'])->toBe(['draft' => 'gray', 'published' => 'success']);
});

it('Column: iconMap() sets kind=icon with map', function (): void {
    $json = encodeColumn(
        Column::make('status')->iconMap(['draft' => ['icon' => 'pencil', 'color' => 'gray']])
    );

    expect($json['kind'])->toBe('icon')
        ->and($json['iconMap']['draft'])->toBe(['icon' => 'pencil', 'color' => 'gray']);
});

// ---------------------------------------------------------------------------
// Color enum
// ---------------------------------------------------------------------------

it('Color: enum values serialize to lowercase strings', function (): void {
    expect(Color::Success->value)->toBe('success')
        ->and(Color::Danger->value)->toBe('danger')
        ->and(Color::Warning->value)->toBe('warning')
        ->and(Color::Info->value)->toBe('info')
        ->and(Color::Gray->value)->toBe('gray')
        ->and(Color::Primary->value)->toBe('primary');
});

// ---------------------------------------------------------------------------
// hidden() / visible()
// ---------------------------------------------------------------------------

it('Column: hidden() column excluded from TableBuilder serialization', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns([
            Column::make('title')->label('Title'),
            Column::make('secret')->hidden(),
        ])
        ->query(fn () => null);

    $json = json_decode(json_encode($table->toNode()), true);
    $names = array_column($json['options']['columns'], 'name');

    expect($names)->toBe(['title'])
        ->and($names)->not->toContain('secret');
});

it('Column: visible(Closure false) column excluded from TableBuilder serialization', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns([
            Column::make('title'),
            Column::make('secret')->visible(fn () => false),
        ])
        ->query(fn () => null);

    $json = json_decode(json_encode($table->toNode()), true);
    $names = array_column($json['options']['columns'], 'name');

    expect($names)->not->toContain('secret');
});

it('Column: visible(Closure true) column included in TableBuilder serialization', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns([
            Column::make('title'),
            Column::make('extra')->visible(fn () => true),
        ])
        ->query(fn () => null);

    $json = json_decode(json_encode($table->toNode()), true);
    $names = array_column($json['options']['columns'], 'name');

    expect($names)->toContain('extra');
});

// ---------------------------------------------------------------------------
// Normalization in columns()
// ---------------------------------------------------------------------------

it('Column: columns() accepts Column instances directly', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns([Column::make('title')->label('Title')])
        ->query(fn () => null);

    $json = json_decode(json_encode($table->toNode()), true);
    expect($json['options']['columns'][0]['name'])->toBe('title');
});

it('Column: columns() normalizes legacy array syntax', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns([['name' => 'title', 'label' => 'Title', 'kind' => 'text']])
        ->query(fn () => null);

    $json = json_decode(json_encode($table->toNode()), true);
    expect($json['options']['columns'][0]['name'])->toBe('title');
});

it('Column: columns() normalizes shorthand sugar', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->query(fn () => null);

    $json = json_decode(json_encode($table->toNode()), true);
    expect($json['options']['columns'][0]['name'])->toBe('title')
        ->and($json['options']['columns'][0]['label'])->toBe('Title');
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

it('TableBuilder: paginate() emits pagination in wire options', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->paginate(50, [10, 25, 50, 100])
        ->query(fn () => null);

    $json = json_decode(json_encode($table->toNode()), true);
    expect($json['options']['pagination'])->toBe([
        'perPage' => 50,
        'options' => [10, 25, 50, 100],
    ]);
});

it('TableBuilder: default pagination emits defaults when paginate() not called', function (): void {
    $s = new S;
    $table = $s->table('posts')
        ->columns(['title' => 'Title'])
        ->query(fn () => null);

    $json = json_decode(json_encode($table->toNode()), true);
    expect($json['options']['pagination'])->toBe([
        'perPage' => 25,
        'options' => [10, 25, 50, 100],
    ]);
});
