<?php

use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Stat;

function encodeStat(Stat $stat): array
{
    return json_decode(json_encode($stat), true);
}

// ---------------------------------------------------------------------------
// Wire shape
// ---------------------------------------------------------------------------

it('Stat: minimal chain emits kind=stat with label and value', function (): void {
    $json = encodeStat(Stat::make('Revenue')->value(42));

    expect($json['kind'])->toBe('stat')
        ->and($json['options']['label'])->toBe('Revenue')
        ->and($json['options']['value'])->toBe(42);
});

it('Stat: make() static constructor matches new Stat()', function (): void {
    $a = encodeStat(Stat::make('Users')->value(100));
    $b = encodeStat((new Stat('Users'))->value(100));

    expect($a)->toBe($b);
});

it('Stat: description emits description key', function (): void {
    $json = encodeStat(Stat::make('Views')->value(0)->description('Since last month'));

    expect($json['options']['description'])->toBe('Since last month');
});

it('Stat: description(null) omits key', function (): void {
    $json = encodeStat(Stat::make('Views')->value(0)->description(null));

    expect($json['options'])->not->toHaveKey('description');
});

it('Stat: delta emits text and direction', function (): void {
    $json = encodeStat(Stat::make('Revenue')->value(1000)->delta('+12%', 'up'));

    expect($json['options']['delta'])->toBe(['text' => '+12%', 'direction' => 'up']);
});

it('Stat: delta down direction serializes correctly', function (): void {
    $json = encodeStat(Stat::make('Churn')->value(5)->delta('-3%', 'down'));

    expect($json['options']['delta']['direction'])->toBe('down');
});

it('Stat: delta flat direction serializes correctly', function (): void {
    $json = encodeStat(Stat::make('Sessions')->value(500)->delta('0%', 'flat'));

    expect($json['options']['delta']['direction'])->toBe('flat');
});

it('Stat: icon emits lucide name string', function (): void {
    $json = encodeStat(Stat::make('Sales')->value(9)->icon('trending-up'));

    expect($json['options']['icon'])->toBe('trending-up');
});

it('Stat: Color enum serializes to lowercase value', function (): void {
    $json = encodeStat(Stat::make('Revenue')->value(0)->color(Color::Success));

    expect($json['options']['color'])->toBe('success');
});

it('Stat: plain string color passes through', function (): void {
    $json = encodeStat(Stat::make('Custom')->value(0)->color('brand'));

    expect($json['options']['color'])->toBe('brand');
});

it('Stat: sparkline emits numeric array', function (): void {
    $json = encodeStat(Stat::make('Revenue')->value(0)->sparkline([10, 20, 15, 30]));

    expect($json['options']['sparkline'])->toBe([10, 20, 15, 30]);
});

it('Stat: closure value is resolved at serialization time', function (): void {
    $json = encodeStat(Stat::make('Posts')->value(fn () => 99));

    expect($json['options']['value'])->toBe(99);
});

it('Stat: omitted optional keys are absent from wire', function (): void {
    $json = encodeStat(Stat::make('Bare')->value('hello'));

    expect($json['options'])->not->toHaveKey('description')
        ->and($json['options'])->not->toHaveKey('delta')
        ->and($json['options'])->not->toHaveKey('icon')
        ->and($json['options'])->not->toHaveKey('color')
        ->and($json['options'])->not->toHaveKey('sparkline');
});

it('Stat: full chain produces expected descriptor shape', function (): void {
    $json = encodeStat(
        Stat::make('Monthly Revenue')
            ->value('$12,400')
            ->description('vs last month')
            ->delta('+8%', 'up')
            ->icon('dollar-sign')
            ->color(Color::Success)
            ->sparkline([100, 120, 115, 140, 160])
    );

    expect($json['kind'])->toBe('stat')
        ->and($json['options'])->toBe([
            'label'       => 'Monthly Revenue',
            'value'       => '$12,400',
            'description' => 'vs last month',
            'delta'       => ['text' => '+8%', 'direction' => 'up'],
            'icon'        => 'dollar-sign',
            'color'       => 'success',
            'sparkline'   => [100, 120, 115, 140, 160],
        ])
        ->and($json)->toHaveKey('meta');
});

// ---------------------------------------------------------------------------
// S helper
// ---------------------------------------------------------------------------

it('S::stat() delegates to Stat::make()', function (): void {
    $s = new S;
    $json = encodeStat($s->stat('Signups')->value(77));

    expect($json['kind'])->toBe('stat')
        ->and($json['options']['value'])->toBe(77);
});
