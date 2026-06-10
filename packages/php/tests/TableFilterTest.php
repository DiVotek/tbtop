<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Dsl\Fields\Boolean;
use Tbtop\Admin\Dsl\Fields\Daterange;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Fields\Tags;
use Tbtop\Admin\Dsl\Fields\Text;
use Tbtop\Admin\Http\TableFilterApplier;

beforeEach(function () {
    Schema::create('items', function ($table): void {
        $table->id();
        $table->string('title');
        $table->string('status')->default('draft');
        $table->boolean('featured')->default(false);
        $table->date('published_date')->nullable();
        $table->json('tags')->nullable();
    });
    DB::table('items')->insert([
        ['title' => 'Alpha post', 'status' => 'published', 'featured' => true, 'published_date' => '2024-01-10', 'tags' => '["php","laravel"]'],
        ['title' => 'Beta draft', 'status' => 'draft', 'featured' => false, 'published_date' => '2024-03-15', 'tags' => '["react"]'],
        ['title' => 'Gamma post', 'status' => 'published', 'featured' => false, 'published_date' => '2024-05-20', 'tags' => '["php","vue"]'],
    ]);
});

// text / textarea / slug → LIKE %v%
it('TableFilter: text kind applies LIKE filter', function (): void {
    $builder = DB::table('items');
    $fields = [Text::make('title')];
    TableFilterApplier::apply($fields, ['title' => 'post'], $builder);
    $rows = $builder->get();

    expect($rows->pluck('title')->all())->toBe(['Alpha post', 'Gamma post']);
});

// select → where =
it('TableFilter: select kind applies equality filter', function (): void {
    $builder = DB::table('items');
    $fields = [Select::make('status')->options([
        ['value' => 'draft', 'label' => 'Draft'],
        ['value' => 'published', 'label' => 'Published'],
    ])];
    TableFilterApplier::apply($fields, ['status' => 'draft'], $builder);
    $rows = $builder->get();

    expect($rows->pluck('title')->all())->toBe(['Beta draft']);
});

// boolean → where = with cast from '1'/'0'/'true'/'false'
it('TableFilter: boolean kind casts string values', function (): void {
    $builder = DB::table('items');
    $fields = [Boolean::make('featured')];
    TableFilterApplier::apply($fields, ['featured' => '1'], $builder);
    $rows = $builder->get();
    expect($rows->pluck('title')->all())->toBe(['Alpha post']);
});

it('TableFilter: boolean kind casts false string', function (): void {
    $builder = DB::table('items');
    $fields = [Boolean::make('featured')];
    TableFilterApplier::apply($fields, ['featured' => 'false'], $builder);
    $rows = $builder->get();
    expect($rows->pluck('title')->all())->toBe(['Beta draft', 'Gamma post']);
});

// tags / array value → whereIn (column value is one of the provided values)
it('TableFilter: tags kind applies whereIn on scalar column', function (): void {
    $builder = DB::table('items');
    $fields = [Tags::make('status')];
    // array of allowed statuses → WHERE status IN ('published')
    TableFilterApplier::apply($fields, ['status' => ['published']], $builder);
    $rows = $builder->get();
    expect($rows->pluck('title')->all())->toBe(['Alpha post', 'Gamma post']);
});

// daterange → where >= from / where <= to (each side optional)
it('TableFilter: daterange applies both bounds', function (): void {
    $builder = DB::table('items');
    $fields = [Daterange::make('published_date')];
    TableFilterApplier::apply($fields, ['published_date' => ['from' => '2024-02-01', 'to' => '2024-04-30']], $builder);
    $rows = $builder->get();
    expect($rows->pluck('title')->all())->toBe(['Beta draft']);
});

it('TableFilter: daterange with only from bound', function (): void {
    $builder = DB::table('items');
    $fields = [Daterange::make('published_date')];
    TableFilterApplier::apply($fields, ['published_date' => ['from' => '2024-03-01']], $builder);
    $rows = $builder->get();
    expect($rows->pluck('title')->all())->toBe(['Beta draft', 'Gamma post']);
});

it('TableFilter: daterange with only to bound', function (): void {
    $builder = DB::table('items');
    $fields = [Daterange::make('published_date')];
    TableFilterApplier::apply($fields, ['published_date' => ['to' => '2024-02-28']], $builder);
    $rows = $builder->get();
    expect($rows->pluck('title')->all())->toBe(['Alpha post']);
});

// filterUsing closure overrides default
it('TableFilter: filterUsing closure takes priority over default mapping', function (): void {
    $builder = DB::table('items');
    $field = Text::make('status')->filterUsing(function ($q, $value) {
        // custom: exact match on status (overrides LIKE)
        return $q->where('status', $value);
    });
    TableFilterApplier::apply([$field], ['status' => 'published'], $builder);
    $rows = $builder->get();
    expect($rows->pluck('title')->all())->toBe(['Alpha post', 'Gamma post']);
});

// empty values are skipped
it('TableFilter: empty string is skipped', function (): void {
    $builder = DB::table('items');
    $fields = [Text::make('title')];
    TableFilterApplier::apply($fields, ['title' => ''], $builder);
    expect($builder->get()->count())->toBe(3);
});

it('TableFilter: null value is skipped', function (): void {
    $builder = DB::table('items');
    $fields = [Select::make('status')];
    TableFilterApplier::apply($fields, ['status' => null], $builder);
    expect($builder->get()->count())->toBe(3);
});

it('TableFilter: empty array is skipped', function (): void {
    $builder = DB::table('items');
    $fields = [Tags::make('tags')];
    TableFilterApplier::apply($fields, ['tags' => []], $builder);
    expect($builder->get()->count())->toBe(3);
});

// application order preserved (filter A then filter B → intersection)
it('TableFilter: application order preserved - multiple filters intersect', function (): void {
    $builder = DB::table('items');
    $fields = [
        Select::make('status'),
        Boolean::make('featured'),
    ];
    TableFilterApplier::apply($fields, ['status' => 'published', 'featured' => '1'], $builder);
    $rows = $builder->get();
    expect($rows->pluck('title')->all())->toBe(['Alpha post']);
});

// unknown kind without filterUsing throws
it('TableFilter: unknown kind without filterUsing throws at apply time', function (): void {
    $builder = DB::table('items');
    $field = new class('custom_field') extends Field
    {
        protected function kind(): string
        {
            return 'unknown_custom';
        }
    };
    TableFilterApplier::apply([$field], ['custom_field' => 'value'], $builder);
})->throws(InvalidArgumentException::class);
