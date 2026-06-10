<?php

namespace App\Admin\Pages;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class DashboardPage extends Page
{
    public static function path(): string
    {
        return 'dashboard';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Overview', 'label' => 'Dashboard', 'order' => 0];
    }

    public function title(): string
    {
        return 'Dashboard';
    }

    public function view(S $s): Node
    {
        return $s->grid(['cols' => 2], [
            $s->chart('byInterval', 'bar', [
                'title' => 'Posts over time',
                'xKey' => 'period',
                'series' => [['dataKey' => 'count', 'label' => 'Posts']],
            ])
                ->params([
                    $s->select('interval')->set('options', [
                        ['value' => 'day', 'label' => 'Day'],
                        ['value' => 'week', 'label' => 'Week'],
                        ['value' => 'month', 'label' => 'Month'],
                    ])->default('month'),
                ])
                ->query(function (mixed $request, array $params) {
                    $interval = $params['interval'] ?? 'month';
                    $format = match ($interval) {
                        'day'  => '%Y-%m-%d',
                        'week' => '%Y-W%W',
                        default => '%Y-%m',
                    };

                    return DB::table('posts')
                        ->selectRaw("strftime(?, created_at) as period, count(*) as count", [$format])
                        ->groupBy('period')
                        ->orderBy('period')
                        ->get();
                })
                ->toNode(),
            $s->chart('byStatus', 'donut', [
                'title' => 'Published vs draft',
                'nameKey' => 'status',
                'series' => [['dataKey' => 'total', 'label' => 'Posts']],
            ])
                ->query(fn() => DB::table('posts')
                    ->selectRaw("case when published = 1 then 'Published' else 'Draft' end as status, count(*) as total")
                    ->groupBy('published')
                    ->orderBy('total')
                    ->get())
                ->toNode(),
        ]);
    }
}
