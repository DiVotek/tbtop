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
// Image column kind + shape variants
// ---------------------------------------------------------------------------

it('Column: image() sets kind=image and omits shape by default', function (): void {
    $json = encodeColumn(Column::make('cover')->image());

    expect($json['kind'])->toBe('image')
        ->and(array_key_exists('shape', $json))->toBeFalse();
});

it('Column: image()->square() emits shape=square', function (): void {
    $json = encodeColumn(Column::make('cover')->image()->square());

    expect($json['kind'])->toBe('image')
        ->and($json['shape'])->toBe('square');
});

it('Column: image()->circular() emits shape=circular', function (): void {
    $json = encodeColumn(Column::make('cover')->image()->circular());

    expect($json['kind'])->toBe('image')
        ->and($json['shape'])->toBe('circular');
});

it('Column: square()->circular() is last-wins (circular)', function (): void {
    $json = encodeColumn(Column::make('cover')->image()->square()->circular());

    expect($json['shape'])->toBe('circular');
});

it('Column: image() alt is omitted by default', function (): void {
    $json = encodeColumn(Column::make('cover')->image());

    expect(array_key_exists('alt', $json))->toBeFalse();
});

it('Column: image()->alt() emits the alt string', function (): void {
    $json = encodeColumn(Column::make('cover')->image()->alt('Avatar'));

    expect($json['alt'])->toBe('Avatar');
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

// ---------------------------------------------------------------------------
// Editable columns
// ---------------------------------------------------------------------------

it('Column: toggle() emits editable.as=boolean and kind=boolean', function (): void {
    $json = encodeColumn(
        Column::make('published')->toggle()->onSave(fn ($r, $v) => null)
    );

    expect($json['kind'])->toBe('boolean')
        ->and($json['editable']['as'])->toBe('boolean')
        ->and($json['editable'])->not->toHaveKey('constraints');
});

it('Column: textInput() + rules() emit editable.as=text with constraints', function (): void {
    $json = encodeColumn(
        Column::make('title')->textInput()->rules('required|max:200')->onSave(fn ($r, $v) => null)
    );

    expect($json['kind'])->toBe('text')
        ->and($json['editable']['as'])->toBe('text')
        ->and($json['editable']['constraints']['required'])->toBeTrue()
        ->and($json['editable']['constraints']['max'])->toBe(200);
});

it('Column: selectColumn() + options() emit editable.as=select with options and kind=select', function (): void {
    $json = encodeColumn(
        Column::make('status')
            ->selectColumn()
            ->options([
                ['value' => 'draft', 'label' => 'Draft'],
                ['value' => 'published', 'label' => 'Published'],
            ])
            ->rules('required|in:draft,published')
            ->onSave(fn ($r, $v) => null)
    );

    expect($json['kind'])->toBe('select')
        ->and($json['editable']['as'])->toBe('select')
        ->and($json['editable']['options'])->toBe([
            ['value' => 'draft', 'label' => 'Draft'],
            ['value' => 'published', 'label' => 'Published'],
        ])
        ->and($json['editable']['constraints']['required'])->toBeTrue();
});

it('Column: selectColumn() normalizes non-string option values to strings', function (): void {
    $json = encodeColumn(
        Column::make('priority')
            ->selectColumn()
            ->options([
                ['value' => 1, 'label' => 'Low'],
                ['value' => 2, 'label' => 'High'],
            ])
            ->onSave(fn ($r, $v) => null)
    );

    expect($json['editable']['options'])->toBe([
        ['value' => '1', 'label' => 'Low'],
        ['value' => '2', 'label' => 'High'],
    ]);
});

it('Column: selectColumn() without options() omits the options key', function (): void {
    $json = encodeColumn(
        Column::make('status')->selectColumn()->onSave(fn ($r, $v) => null)
    );

    expect($json['editable']['as'])->toBe('select')
        ->and($json['editable'])->not->toHaveKey('options');
});

it('Column: selectColumn() without onSave() throws when added to a table via columns()', function (): void {
    $s = new S;

    expect(fn () => $s->table('posts')
        ->columns([
            Column::make('status')->selectColumn()->options([['value' => 'a', 'label' => 'A']]),
        ])
        ->query(fn () => null)
    )->toThrow(InvalidArgumentException::class, 'requires ->onSave()');
});

it('Column: onSave closure does NOT appear in jsonSerialize() output', function (): void {
    $json = encodeColumn(
        Column::make('published')->toggle()->onSave(fn ($r, $v) => null)
    );

    expect($json)->not->toHaveKey('onSaveClosure')
        ->and($json)->not->toHaveKey('onSave');
});

it('Column: editRuleEntries() returns the rules passed via rules()', function (): void {
    $col = Column::make('title')->textInput()->rules('required|max:200')->onSave(fn ($r, $v) => null);

    expect($col->editRuleEntries())->toBe(['required', 'max:200']);
});

it('Column: non-editable column has no editable key in wire output', function (): void {
    $json = encodeColumn(Column::make('title')->kind('text'));

    expect($json)->not->toHaveKey('editable');
});

it('Column: toggle() without onSave() throws when added to a table via columns()', function (): void {
    $s = new S;

    expect(fn () => $s->table('posts')
        ->columns([
            Column::make('published')->toggle(),
        ])
        ->query(fn () => null)
    )->toThrow(InvalidArgumentException::class, 'requires ->onSave()');
});
