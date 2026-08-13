<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** Fixture page for DaterangeRangesHttpTest. */
class DaterangeRangesPage extends Page
{
    public static function path(): string
    {
        return 'daterange-ranges-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->select('season')->options([
                    ['value' => 'winter', 'label' => 'Winter'],
                    ['value' => 'summer', 'label' => 'Summer'],
                ]),
                $s->daterange('stay')
                    ->dependsOn('season')
                    ->disabledRanges(fn (array $deps): array => ($deps['season'] ?? '') === 'winter'
                        ? [['from' => null, 'to' => '2026-03-01']]
                        : [['from' => '2026-07-01', 'to' => '2026-07-15']]),
                $s->boolean('enabled'),
                $s->daterange('boolean-stay')
                    ->dependsOn('enabled')
                    ->disabledRanges(fn (array $deps): array => [[
                        'from' => ($deps['enabled'] ?? '') === '1' ? '2026-08-01' : '2026-09-01',
                        'to' => null,
                    ]]),
                $s->daterange('gone')
                    ->disabledRanges(fn (array $deps): array => [
                        ['from' => '2026-01-01', 'to' => null],
                    ])
                    ->when(false),
            ])->onSubmit(fn () => null),
        ]);
    }
}
