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

it('Stat: icon emits structured shape', function (): void {
    $json = encodeStat(Stat::make('Sales')->value(9)->icon('trending-up'));

    expect($json['options']['icon'])->toBe(['name' => 'trending-up', 'position' => 'left']);
});

it('Stat: icon with explicit right position', function (): void {
    $json = encodeStat(Stat::make('Sales')->value(9)->icon('trending-up', 'right'));

    expect($json['options']['icon'])->toBe(['name' => 'trending-up', 'position' => 'right']);
});

it('Stat: tooltip serializes in options', function (): void {
    $json = encodeStat(Stat::make('Sales')->value(9)->tooltip('Total this month'));

    expect($json['options']['tooltip'])->toBe('Total this month');
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

it('Stat: sparkline without a position omits sparklinePosition (back-compat)', function (): void {
    $json = encodeStat(Stat::make('Revenue')->value(0)->sparkline([10, 20, 15, 30]));

    expect($json['options'])->not->toHaveKey('sparklinePosition');
});

it('Stat: sparkline position defaults to inline explicitly and still omits the key', function (): void {
    $json = encodeStat(Stat::make('Revenue')->value(0)->sparkline([10, 20], 'inline'));

    expect($json['options'])->not->toHaveKey('sparklinePosition');
});

it('Stat: sparkline position "bottom" emits sparklinePosition', function (): void {
    $json = encodeStat(Stat::make('Revenue')->value(0)->sparkline([10, 20, 15, 30], 'bottom'));

    expect($json['options']['sparklinePosition'])->toBe('bottom');
});

it('Stat: sparkline with an invalid position throws', function (): void {
    Stat::make('Revenue')->value(0)->sparkline([10, 20], 'top');
})->throws(InvalidArgumentException::class);

it('Stat: closure value is resolved at serialization time', function (): void {
    $json = encodeStat(Stat::make('Posts')->value(fn () => 99));

    expect($json['options']['value'])->toBe(99);
});

it('Stat: omitted optional keys are absent from wire', function (): void {
    $json = encodeStat(Stat::make('Bare')->value('hello'));

    expect($json['options'])->not->toHaveKey('description')
        ->and($json['options'])->not->toHaveKey('delta')
        ->and($json['options'])->not->toHaveKey('icon')
        ->and($json['options'])->not->toHaveKey('tooltip')
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
            'label' => 'Monthly Revenue',
            'value' => '$12,400',
            'description' => 'vs last month',
            'delta' => ['text' => '+8%', 'direction' => 'up'],
            'color' => 'success',
            'sparkline' => [100, 120, 115, 140, 160],
            'icon' => ['name' => 'dollar-sign', 'position' => 'left'],
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

it('S::stat() registers the stat in the collector keyed by label', function (): void {
    $s = new S;
    $stat = $s->stat('Signups')->value(77);

    expect($s->collectedStats())->toBe(['Signups' => $stat]);
});

// ---------------------------------------------------------------------------
// Colored description, trend, sparkline color
// ---------------------------------------------------------------------------

it('Stat: description with a semantic color emits descriptionColor', function (): void {
    $json = encodeStat(Stat::make('Disk')->value('64 GB')->description('healthy', 'success'));

    expect($json['options']['description'])->toBe('healthy')
        ->and($json['options']['descriptionColor'])->toBe('success');
});

it('Stat: description without a color omits descriptionColor (back-compat)', function (): void {
    $json = encodeStat(Stat::make('Disk')->value(0)->description('as before'));

    expect($json['options'])->not->toHaveKey('descriptionColor');
});

it('Stat: description with an invalid color throws', function (): void {
    Stat::make('Disk')->value(0)->description('x', 'primary');
})->throws(InvalidArgumentException::class);

it('Stat: trend emits direction', function (): void {
    $json = encodeStat(Stat::make('MRR')->value(1)->trend('up'));

    expect($json['options']['trend'])->toBe('up');
});

it('Stat: invalid trend direction throws', function (): void {
    Stat::make('MRR')->value(1)->trend('flat');
})->throws(InvalidArgumentException::class);

it('Stat: sparklineColor emits semantic token', function (): void {
    $json = encodeStat(Stat::make('CPU')->value(1)->sparkline([1, 2])->sparklineColor('success'));

    expect($json['options']['sparklineColor'])->toBe('success');
});

it('Stat: invalid sparklineColor throws', function (): void {
    Stat::make('CPU')->value(1)->sparklineColor('teal');
})->throws(InvalidArgumentException::class);

it('Stat: string value with slashes and units serializes as-is', function (): void {
    $json = encodeStat(Stat::make('Disk')->value('64.43 / 74.79 GB'));

    expect($json['options']['value'])->toBe('64.43 / 74.79 GB');
});

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

it('Stat: poll emits poll seconds and source keyed by label', function (): void {
    $json = encodeStat(Stat::make('Active users')->value(fn () => 1)->poll(10));

    expect($json['options']['poll'])->toBe(10)
        ->and($json['options']['source'])->toBe('Active users');
});

it('Stat: without poll neither poll nor source is emitted (back-compat)', function (): void {
    $json = encodeStat(Stat::make('Active users')->value(1));

    expect($json['options'])->not->toHaveKey('poll')
        ->and($json['options'])->not->toHaveKey('source');
});

it('Stat: poll below the 5s minimum throws', function (): void {
    Stat::make('Active users')->value(1)->poll(4);
})->throws(InvalidArgumentException::class);

it('Stat: queryClosure is null without poll', function (): void {
    expect(Stat::make('Plain')->value(1)->queryClosure())->toBeNull();
});

it('Stat: queryClosure re-invokes the value closure and returns the descriptor slice', function (): void {
    $calls = 0;
    $stat = Stat::make('Active users')
        ->value(function () use (&$calls): int {
            $calls++;

            return $calls;
        })
        ->description('online')
        ->sparkline([1, 2])
        ->poll(10);

    $query = $stat->queryClosure();
    expect($query())->toBe(['value' => 1, 'description' => 'online', 'sparkline' => [1, 2]])
        ->and($query())->toBe(['value' => 2, 'description' => 'online', 'sparkline' => [1, 2]]);
});
