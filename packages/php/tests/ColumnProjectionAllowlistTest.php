<?php

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\ColumnProjection;
use Tbtop\Admin\Tests\Fixtures\CarModel;
use Tbtop\Admin\Tests\Fixtures\LocationModel;

it('ColumnProjection: query-builder rows only expose id and declared visible columns', function (): void {
    Schema::create('allowlist_posts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->string('status')->default('draft');
        $table->integer('price')->default(0);
    });
    DB::table('allowlist_posts')->insert([
        'title' => 'Post A',
        'status' => 'published',
        'price' => 1000,
    ]);

    $table = (new TableBuilder('allowlist_posts'))
        ->columns([
            Column::make('title'),
            Column::make('status')->hidden(),
        ])
        ->query(fn () => DB::table('allowlist_posts'));

    $rows = DB::table('allowlist_posts')->orderBy('id')->get()->all();
    $result = ColumnProjection::apply($table, $rows);
    $wire = json_decode(json_encode($result[0]), true);

    expect($wire)->toHaveKey('id')
        ->and($wire)->toHaveKey('title', 'Post A')
        ->and($wire)->not->toHaveKey('status')
        ->and($wire)->not->toHaveKey('price');
});

it('ColumnProjection: Eloquent rows only expose the key and declared visible columns', function (): void {
    Schema::create('locations', function ($table): void {
        $table->id();
        $table->string('name');
        $table->softDeletes();
    });
    Schema::create('cars', function ($table): void {
        $table->id();
        $table->string('name');
        $table->foreignId('location_id')->nullable();
    });

    $loc = LocationModel::create(['name' => 'Berlin']);
    CarModel::create(['name' => 'A', 'location_id' => $loc->id]);

    $table = (new TableBuilder('cars'))
        ->columns([
            Column::make('name'),
            Column::make('location.name'),
        ])
        ->query(fn () => CarModel::query());

    $result = ColumnProjection::apply($table, CarModel::with('location')->get());

    expect($result[0])->toHaveKey('id')
        ->and($result[0])->toHaveKey('name', 'A')
        ->and($result[0])->toHaveKey('location.name', 'Berlin')
        ->and($result[0])->not->toHaveKey('location_id')
        ->and($result[0])->not->toHaveKey('location');
});

it('ColumnProjection: carries the groups() column even when it is not a visible declared column', function (): void {
    Schema::create('grouped_posts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->string('status');
        $table->string('secret')->default('s');
    });
    DB::table('grouped_posts')->insert(['title' => 'Post A', 'status' => 'published']);

    $table = (new TableBuilder('grouped_posts'))
        ->columns([Column::make('title')])
        ->defaultSort('status')
        ->groups('status')
        ->query(fn () => DB::table('grouped_posts'));

    $rows = DB::table('grouped_posts')->get()->all();
    $wire = json_decode(json_encode(ColumnProjection::apply($table, $rows)[0]), true);

    expect($wire)->toHaveKey('status', 'published')
        ->and($wire)->not->toHaveKey('secret');
});

it('ColumnProjection: carries the groups() column for Eloquent rows', function (): void {
    Schema::create('cars', function ($table): void {
        $table->id();
        $table->string('name');
        $table->foreignId('location_id')->nullable();
    });
    CarModel::create(['name' => 'A', 'location_id' => 7]);

    $table = (new TableBuilder('cars'))
        ->columns([Column::make('name')])
        ->defaultSort('location_id')
        ->groups('location_id')
        ->query(fn () => CarModel::query());

    $result = ColumnProjection::apply($table, CarModel::query()->get());

    expect($result[0])->toHaveKey('location_id', 7);
});

it('ColumnProjection: a formatted id column leaves the record key intact under _key', function (): void {
    Schema::create('keyed_posts', function ($table): void {
        $table->id();
        $table->string('title');
    });
    DB::table('keyed_posts')->insert(['id' => 42, 'title' => 'Post A']);

    $table = (new TableBuilder('keyed_posts'))
        ->columns([Column::make('id')->formatUsing(fn ($v) => "#{$v}"), Column::make('title')])
        ->query(fn () => DB::table('keyed_posts'));

    $wire = json_decode(json_encode(ColumnProjection::apply($table, DB::table('keyed_posts')->get()->all())[0]), true);
    $ctx = new ActionCtx(Request::create('/'), null, row: $wire);

    expect($wire['id'])->toBe('#42')
        ->and($wire['_key'])->toBe(42)
        ->and($ctx->key())->toBe(42);
});

it('ColumnProjection: a model keyed by a uuid ships that key under _key', function (): void {
    Schema::create('uuid_posts', function ($table): void {
        $table->uuid('uuid')->primary();
        $table->string('title');
    });
    $model = new class extends Model
    {
        protected $table = 'uuid_posts';

        protected $primaryKey = 'uuid';

        protected $keyType = 'string';

        public $incrementing = false;

        public $timestamps = false;

        protected $guarded = [];
    };
    $model->newQuery()->create(['uuid' => '9f3c1a2e-0000-4000-8000-000000000001', 'title' => 'Post A']);

    $table = (new TableBuilder('uuid_posts'))
        ->columns([Column::make('title')])
        ->query(fn () => $model->newQuery());

    $row = ColumnProjection::apply($table, $model->newQuery()->get())[0];

    expect($row['_key'])->toBe('9f3c1a2e-0000-4000-8000-000000000001')
        ->and((new ActionCtx(Request::create('/'), null, row: $row))->key())->toBe('9f3c1a2e-0000-4000-8000-000000000001');
});

it('ActionCtx::key falls back to id for a row without _key', function (): void {
    expect((new ActionCtx(Request::create('/'), null, row: ['id' => 7]))->key())->toBe(7)
        ->and((new ActionCtx(Request::create('/'), null))->key())->toBeNull();
});
