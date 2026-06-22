<?php

use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\ColumnProjection;
use Tbtop\Admin\Tests\Fixtures\ArrayCastPost;
use Tbtop\Admin\Tests\Fixtures\FakeTranslatablePost;

beforeEach(function (): void {
    config()->set('tbtop-admin.content_locales', ['en', 'uk']);
    config()->set('tbtop-admin.default_content_locale', 'en');
    Schema::create('ftposts', function ($table): void {
        $table->id();
        $table->text('name');
        $table->integer('views')->default(0);
    });
});

function translatableTable(string $modelClass): TableBuilder
{
    return (new TableBuilder('ftposts'))
        ->columns([
            Column::make('name')->kind('text')->translatable(),
            Column::make('views')->kind('text'),
        ])
        ->query(fn () => $modelClass::query());
}

// ---------------------------------------------------------------------------
// Spatie-shaped model (the bug)
// ---------------------------------------------------------------------------

it('flattens a Spatie-shaped translatable column to a string, not the locale map', function (): void {
    FakeTranslatablePost::create([
        'name' => json_encode(['en' => 'Brand', 'uk' => 'Марка']),
        'views' => 5,
    ]);

    $result = ColumnProjection::apply(translatableTable(FakeTranslatablePost::class), FakeTranslatablePost::all());

    expect($result[0]['name'])->toBe('Brand')
        ->and($result[0]['name'])->not->toBeArray()
        ->and($result[0]['views'])->toBe(5);
    // The whole point: serialized JSON carries a string, never an object.
    expect(json_encode($result[0]))->toContain('"name":"Brand"');
});

it('falls back to the first non-empty locale when the default is missing', function (): void {
    FakeTranslatablePost::create(['name' => json_encode(['uk' => 'Тільки укр']), 'views' => 7]);

    $result = ColumnProjection::apply(translatableTable(FakeTranslatablePost::class), FakeTranslatablePost::all());

    // Assert on the serialized wire — a returned model would re-flatten via
    // ArrayAccess and hide a map leak; json_encode shows what the client gets.
    expect(json_decode(json_encode($result[0]), true)['name'])->toBe('Тільки укр');
});

it('keeps the row id and other attributes on the model array path', function (): void {
    $post = FakeTranslatablePost::create([
        'name' => json_encode(['en' => 'Brand', 'uk' => 'Марка']),
        'views' => 5,
    ]);

    $result = ColumnProjection::apply(translatableTable(FakeTranslatablePost::class), FakeTranslatablePost::all());

    expect($result[0])->toHaveKey('id')
        ->and($result[0]['id'])->toBe($post->id);
});

// ---------------------------------------------------------------------------
// Plain array-cast model (the demo Post shape)
// ---------------------------------------------------------------------------

it('flattens an array-cast translatable column to a string', function (): void {
    ArrayCastPost::create([
        'name' => ['en' => 'Brand', 'uk' => 'Марка'],
        'views' => 9,
    ]);

    $result = ColumnProjection::apply(translatableTable(ArrayCastPost::class), ArrayCastPost::all());

    // Wire assertion: the old code's data_set onto an array-cast model still
    // re-emitted the map through toArray() — json_encode catches that leak.
    $wire = json_decode(json_encode($result[0]), true);
    expect($wire['name'])->toBe('Brand')
        ->and($wire['name'])->not->toBeArray()
        ->and($wire)->toHaveKey('id');
});

// ---------------------------------------------------------------------------
// stdClass path stays object-shaped (existing behavior)
// ---------------------------------------------------------------------------

it('leaves a stdClass row as an object, mutated in place', function (): void {
    $table = (new TableBuilder('ftposts'))
        ->columns([Column::make('name')->kind('text')->translatable()]);
    $row = (object) ['name' => json_encode(['en' => 'Hi', 'uk' => 'Прив']), 'views' => 1];

    $result = ColumnProjection::apply($table, [$row]);

    expect($result[0])->toBeObject()
        ->and($result[0]->name)->toBe('Hi');
});

// ---------------------------------------------------------------------------
// Model without a translatable column still serializes via the array path
// ---------------------------------------------------------------------------

it('applies kind formatting on a non-translatable model column and keeps id', function (): void {
    $post = ArrayCastPost::create(['name' => ['en' => 'x'], 'views' => 3]);
    $table = (new TableBuilder('ftposts'))
        ->columns([Column::make('views')->formatUsing(fn ($v) => "v{$v}")])
        ->query(fn () => ArrayCastPost::query());

    $result = ColumnProjection::apply($table, ArrayCastPost::all());

    expect($result[0])->toBeArray()
        ->and($result[0]['views'])->toBe('v3')
        ->and($result[0]['id'])->toBe($post->id);
});
