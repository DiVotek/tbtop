<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Summary;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\TableQuery;

beforeEach(function (): void {
    Schema::create('sorders', function ($table): void {
        $table->id();
        $table->string('status');
        $table->integer('total');
        $table->integer('rating')->nullable();
        $table->date('placed_on');
    });
    DB::table('sorders')->insert([
        ['status' => 'paid', 'total' => 1000, 'rating' => 4, 'placed_on' => '2026-01-05'],
        ['status' => 'paid', 'total' => 2550, 'rating' => 5, 'placed_on' => '2026-02-10'],
        ['status' => 'new', 'total' => 500, 'rating' => null, 'placed_on' => '2026-03-01'],
    ]);
});

function summaryTable(): TableBuilder
{
    return (new TableBuilder('sorders'))
        ->columns([
            Column::make('status')->sortable(),
            Column::make('total')->money('UAH')->summarize(Summary::sum('Total'), Summary::avg()),
            Column::make('rating')->summarize(Summary::avg(), Summary::min(), Summary::max(), Summary::count()),
            Column::make('placed_on')->date('d.m.Y')->summarize(Summary::min(), Summary::max()),
        ])
        ->filters([Select::make('status')->options([['value' => 'paid', 'label' => 'Paid'], ['value' => 'new', 'label' => 'New']])])
        ->defaultSort('status', 'desc')
        ->paginate(1, [1])
        ->query(fn () => DB::table('sorders'));
}

it('serializes summaries on the column: type, label only when given', function (): void {
    $column = Column::make('total')->summarize(Summary::sum('Total'), Summary::count(), Summary::using(fn () => 'x', 'Note'));

    expect($column->jsonSerialize()['summaries'])->toBe([
        ['type' => 'sum', 'label' => 'Total'],
        ['type' => 'count'],
        ['type' => 'custom', 'label' => 'Note'],
    ]);
});

it('a column without summarize() carries no summaries key', function (): void {
    expect(Column::make('total')->jsonSerialize())->not->toHaveKey('summaries');
});

it('refuses summarize() on a group column', function (): void {
    Column::make('g')->group([Column::make('a')])->summarize(Summary::count())->jsonSerialize();
})->throws(InvalidArgumentException::class, 'summarize() is not supported on a group column');

it('refuses a built-in aggregate on a relation path', function (): void {
    Column::make('author.age')->summarize(Summary::sum());
})->throws(InvalidArgumentException::class, 'use Summary::using()');

it('summarizes every matching row, not just the page, formatted like the cells', function (): void {
    $result = TableQuery::run(summaryTable(), Request::create('/'), DB::table('sorders'));

    expect($result['data'])->toHaveCount(1)
        ->and($result['summaries'])->toBe([
            'total' => ['40.50 UAH', '13.50 UAH'],
            'rating' => [4.5, 4, 5, 3],
            'placed_on' => ['05.01.2026', '01.03.2026'],
        ]);
});

it('summaries follow the filters', function (): void {
    $request = Request::create('/', 'GET', ['filters' => ['status' => 'paid']]);
    $result = TableQuery::run(summaryTable(), $request, DB::table('sorders'));

    expect($result['summaries']['total'])->toBe(['35.50 UAH', '17.75 UAH'])
        ->and($result['summaries']['rating'][3])->toBe(2);
});

it('an empty result sums to zero and leaves min/max/avg null', function (): void {
    $request = Request::create('/', 'GET', ['filters' => ['status' => 'refunded']]);
    $result = TableQuery::run(summaryTable(), $request, DB::table('sorders'));

    expect($result['summaries']['total'])->toBe(['0.00 UAH', null])
        ->and($result['summaries']['rating'])->toBe([null, null, null, 0]);
});

it('a custom summary gets the filtered query and shows what it returns', function (): void {
    $table = (new TableBuilder('sorders'))
        ->columns([
            Column::make('status')->summarize(Summary::using(
                fn ($query) => $query->where('status', 'paid')->count().' paid',
                label: 'Status',
            )),
        ])
        ->defaultSort('status')
        ->query(fn () => DB::table('sorders'));

    expect(TableQuery::run($table, Request::create('/'), DB::table('sorders'))['summaries'])
        ->toBe(['status' => ['2 paid']]);
});

it('a table without summaries adds nothing to the response', function (): void {
    $table = (new TableBuilder('sorders'))->columns([Column::make('status')])->query(fn () => DB::table('sorders'));
    $result = TableQuery::run($table, Request::create('/'), DB::table('sorders'));

    expect($result)->not->toHaveKey('summaries')
        ->and($result)->not->toHaveKey('rows')
        ->and($result['data'][0])->not->toHaveKey('_groupSummary');
});

it('puts each group summary on the first row of its run, over the whole group', function (): void {
    $table = (new TableBuilder('sorders'))
        ->columns([
            Column::make('status'),
            Column::make('total')->money('UAH')->summarize(Summary::sum()),
            Column::make('rating')->summarize(Summary::using(fn ($q) => $q->count(), label: 'Rows')),
        ])
        ->defaultSort('status', 'desc')
        ->groups('status')
        ->paginate(2, [2])
        ->query(fn () => DB::table('sorders'));

    $rows = TableQuery::run($table, Request::create('/'), DB::table('sorders'))['data'];

    expect(array_map(fn ($r) => (array) $r, $rows))->sequence(
        fn ($row) => $row->toHaveKey('_groupSummary', ['total' => ['35.50 UAH'], 'rating' => [2]]),
        fn ($row) => $row->not->toHaveKey('_groupSummary'),
    );

    $page2 = TableQuery::run($table, Request::create('/', 'GET', ['page' => 2]), DB::table('sorders'))['data'];
    expect((array) $page2[0])->toHaveKey('_groupSummary', ['total' => ['5.00 UAH'], 'rating' => [1]]);
});

it('drops the host query\'s select list from the group subtotal query', function (): void {
    $query = fn () => DB::table('sorders')->select('sorders.*');
    $table = (new TableBuilder('sorders'))
        ->columns([Column::make('status'), Column::make('total')->money('UAH')->summarize(Summary::sum())])
        ->defaultSort('status', 'desc')
        ->groups('status')
        ->query($query);

    DB::enableQueryLog();
    $rows = TableQuery::run($table, Request::create('/'), $query())['data'];
    $grouped = collect(DB::getQueryLog())->pluck('query')->first(fn (string $sql) => str_contains($sql, 'group by'));

    expect($grouped)->not->toContain('"sorders".*')
        ->and((array) $rows[0])->toHaveKey('_groupSummary', ['total' => ['35.50 UAH']]);
});

it('keeps one subtotal per displayed group when the group column is formatted', function (): void {
    Schema::create('sevents', function ($table): void {
        $table->id();
        $table->dateTime('at');
        $table->integer('total');
    });
    DB::table('sevents')->insert([
        ['at' => '2026-01-05 15:00:00', 'total' => 2550],
        ['at' => '2026-01-05 10:00:00', 'total' => 1000],
        ['at' => '2026-03-01 09:00:00', 'total' => 500],
    ]);
    $table = (new TableBuilder('sevents'))
        ->columns([Column::make('at')->date('d.m.Y'), Column::make('total')->money('UAH')->summarize(Summary::sum())])
        ->defaultSort('at', 'asc')
        ->groups('at')
        ->query(fn () => DB::table('sevents'));

    $rows = TableQuery::run($table, Request::create('/'), DB::table('sevents'))['data'];

    expect(array_map(fn ($r) => (array) $r, $rows))->sequence(
        fn ($row) => $row->toHaveKey('_groupSummary', ['total' => ['35.50 UAH']]),
        fn ($row) => $row->not->toHaveKey('_groupSummary'),
        fn ($row) => $row->toHaveKey('_groupSummary', ['total' => ['5.00 UAH']]),
    );
});
