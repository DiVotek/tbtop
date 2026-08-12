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
                $s->daterange('gone')
                    ->disabledRanges(fn (array $deps): array => [
                        ['from' => '2026-01-01', 'to' => null],
                    ])
                    ->when(false),
            ])->onSubmit(fn () => null),
        ]);
    }
}
