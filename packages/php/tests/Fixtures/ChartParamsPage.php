<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\LayoutBuilder;
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

    public static function path(): string
    {
        return 'chart-params';
    }

    public function view(S $s): Node|LayoutBuilder
    {
        return $s->stack([
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
