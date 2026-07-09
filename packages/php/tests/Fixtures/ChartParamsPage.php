<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Minimal page used by DataHttpTest to exercise parameterized charts.
 */
class ChartParamsPage extends Page
{
    /** @var array<string, mixed>|null Captured params for assertions. */
    public static ?array $capturedParams = null;

    /** Counts polled-stat value closure invocations across requests. */
    public static int $statValueCalls = 0;

    public static function path(): string
    {
        return 'chart-params';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->stat('Active users')
                ->value(function (): int {
                    static::$statValueCalls++;

                    return 100 + static::$statValueCalls;
                })
                ->description('online now')
                ->sparkline([1, 2, 3])
                ->poll(10)
                ->toNode(),
            $s->stat('Plain stat')->value(fn (): int => 5)->toNode(),
            $s->chart('withParams', 'bar')
                ->params([
                    $s->select('interval')->set('options', [
                        ['value' => 'day', 'label' => 'Day'],
                        ['value' => 'month', 'label' => 'Month'],
                    ])->default('day'),
                    $s->date('from'),
                ])
                ->query(function (mixed $request, array $params): array {
                    static::$capturedParams = $params;

                    return [['period' => $params['interval'], 'count' => 42]];
                })
                ->toNode(),
            $s->chart('noParams', 'line')
                ->query(fn (): array => [['x' => 1, 'y' => 2]])
                ->toNode(),
        ]);
    }
}
