<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\ColumnProjection;

beforeEach(function () {
    Schema::create('cposts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->string('status')->default('draft');
        $table->integer('price')->default(0);
        $table->timestamp('published_at')->nullable();
        $table->boolean('active')->default(false);
    });
    DB::table('cposts')->insert([
        ['title' => 'Post A', 'status' => 'published', 'price' => 1000, 'published_at' => '2024-01-15 10:00:00', 'active' => true],
        ['title' => 'Post B', 'status' => 'draft', 'price' => 2000, 'published_at' => null, 'active' => false],
    ]);
});

// ---------------------------------------------------------------------------
// formatUsing
// ---------------------------------------------------------------------------

it('ColumnProjection: formatUsing closure transforms cell value', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([
            Column::make('title')->formatUsing(fn ($v) => strtoupper((string) $v)),
        ])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->title)->toBe('POST A')
        ->and($result[1]->title)->toBe('POST B');
});

// ---------------------------------------------------------------------------
// date / datetime formatting
// ---------------------------------------------------------------------------

it('ColumnProjection: date() formats timestamps server-side', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([
            Column::make('published_at')->date('Y-m-d'),
        ])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->published_at)->toBe('2024-01-15')
        ->and($result[1]->published_at)->toBeNull();
});

it('ColumnProjection: datetime() formats timestamps with time', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([
            Column::make('published_at')->datetime('d/m/Y H:i'),
        ])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->published_at)->toBe('15/01/2024 10:00');
});

it('ColumnProjection: time() formats timestamps with default H:i format', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([Column::make('published_at')->time()])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->published_at)->toBe('10:00')
        ->and($result[1]->published_at)->toBeNull();
});

// ---------------------------------------------------------------------------
// hidden columns excluded from projection
// ---------------------------------------------------------------------------

it('ColumnProjection: hidden column not processed', function (): void {
    // Use a format that would change the value if processed
    $processed = false;
    $table = (new TableBuilder('cposts'))
        ->columns([
            Column::make('title'),
            Column::make('status')->hidden()->formatUsing(function ($v) use (&$processed) {
                $processed = true;

                return 'HIDDEN';
            }),
        ])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    ColumnProjection::apply($table, $rows);

    expect($processed)->toBeFalse();
});

// ---------------------------------------------------------------------------
// Sort whitelist (security red test)
// ---------------------------------------------------------------------------

it('TableQuery: sort by undeclared column is ignored, defaultSort applied instead', function (): void {
    $rows = $this->getJson('/admin/cposts/tables/cposts?sort=secret_column&dir=desc')
        ->json('data.data');

    // Default sort is id asc; undeclared sort column must be ignored
    expect(array_column($rows, 'title'))->toBe(['Post A', 'Post B']);
});

it('TableQuery: sort by non-sortable column is ignored', function (): void {
    $rows = $this->getJson('/admin/cposts/tables/cposts?sort=status&dir=asc')
        ->json('data.data');

    // status column is not sortable, so default sort (id asc) should apply
    expect(array_column($rows, 'title'))->toBe(['Post A', 'Post B']);
});

it('TableQuery: sort by sortable column is applied', function (): void {
    $rows = $this->getJson('/admin/cposts/tables/cposts?sort=price&dir=desc')
        ->json('data.data');

    expect(array_column($rows, 'title'))->toBe(['Post B', 'Post A']);
});

// ---------------------------------------------------------------------------
// perPage whitelist validation
// ---------------------------------------------------------------------------

it('TableQuery: perPage outside options list falls back to default', function (): void {
    $response = $this->getJson('/admin/cposts/tables/cposts?perPage=999');

    $response->assertOk();
    // response must include pagination info
    expect($response->json('data.perPage'))->toBe(25);
});

it('TableQuery: valid perPage in options is respected', function (): void {
    $response = $this->getJson('/admin/cposts/tables/cposts?perPage=10');

    $response->assertOk();
    expect($response->json('data.perPage'))->toBe(10);
});

// ---------------------------------------------------------------------------
// Response shape includes page and perPage
// ---------------------------------------------------------------------------

it('TableQuery: response includes total, page, perPage keys', function (): void {
    $response = $this->getJson('/admin/cposts/tables/cposts');

    $response->assertOk();
    expect($response->json('data'))->toHaveKeys(['data', 'total', 'page', 'perPage']);
});

// ---------------------------------------------------------------------------
// Per-column searchable union
// ---------------------------------------------------------------------------

it('TableQuery: per-column searchable() participates in search union', function (): void {
    $rows = $this->getJson('/admin/cposts/tables/cposts?search=published')
        ->json('data.data');

    expect(array_column($rows, 'title'))->toBe(['Post A']);
});

it('ColumnProjection: recordUrl attaches a per-row _recordUrl', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([Column::make('title')])
        ->recordUrl(fn ($record) => '/admin/cposts/'.(string) data_get($record, 'id'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->_recordUrl)->toBe('/admin/cposts/'.$result[0]->id)
        ->and($result[1]->_recordUrl)->toBe('/admin/cposts/'.$result[1]->id);
});

it('ColumnProjection: no _recordUrl when recordUrl() is not set', function (): void {
    $table = (new TableBuilder('cposts'))->columns([Column::make('title')]);
    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect(property_exists($result[0], '_recordUrl'))->toBeFalse();
});

// ---------------------------------------------------------------------------
// link()
// ---------------------------------------------------------------------------

it('ColumnProjection: link() resolves a per-row URL from the raw row (stdClass path)', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([
            Column::make('view')->link(fn ($row) => '/admin/cposts/'.$row->id),
        ])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->view)->toBe('/admin/cposts/'.$result[0]->id)
        ->and($result[1]->view)->toBe('/admin/cposts/'.$result[1]->id);
});

it('ColumnProjection: link() closure returning null yields a null cell value', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([
            Column::make('view')->link(fn ($row) => $row->status === 'published' ? '/x' : null),
        ])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->view)->toBe('/x')
        ->and($result[1]->view)->toBeNull();
});

// ---------------------------------------------------------------------------
// image() titleFrom() — per-row tooltip
// ---------------------------------------------------------------------------

it('ColumnProjection: image() without titleFrom stays a plain string (regression)', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([Column::make('title')->image()])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->title)->toBe('Post A');
});

it('ColumnProjection: image()->titleFrom() wraps the value with a resolved title', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([Column::make('title')->image()->titleFrom('status')])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->title)->toBe(['url' => 'Post A', 'title' => 'published']);
});

it('ColumnProjection: image()->titleFrom() with a missing field resolves title to null', function (): void {
    $table = (new TableBuilder('cposts'))
        ->columns([Column::make('title')->image()->titleFrom('does_not_exist')])
        ->query(fn () => DB::table('cposts'));

    $rows = DB::table('cposts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);

    expect($result[0]->title)->toBe(['url' => 'Post A', 'title' => null]);
});

// ---------------------------------------------------------------------------
// Per-column search (colSearch) allowlist
// ---------------------------------------------------------------------------

it('TableQuery: colSearch on an individuallySearchable column narrows results', function (): void {
    $rows = $this->getJson('/admin/cposts/tables/cposts?colSearch[title]=A')
        ->json('data.data');

    expect(array_column($rows, 'title'))->toBe(['Post A']);
});

it('TableQuery: colSearch on an undeclared column is silently ignored', function (): void {
    $response = $this->getJson('/admin/cposts/tables/cposts?colSearch[secret_column]=x');

    $response->assertOk();
    expect(array_column($response->json('data.data'), 'title'))->toBe(['Post A', 'Post B']);
});

it('TableQuery: colSearch on a searchable() (but not individuallySearchable()) column is ignored', function (): void {
    $response = $this->getJson('/admin/cposts/tables/cposts?colSearch[status]=published');

    $response->assertOk();
    expect(array_column($response->json('data.data'), 'title'))->toBe(['Post A', 'Post B']);
});
