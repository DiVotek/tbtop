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
            $s->chart('byMonth', 'line', [
                'title' => 'Posts per month',
                'xKey' => 'month',
                'series' => [['dataKey' => 'count', 'label' => 'Posts']],
            ])
                ->query(fn() => DB::table('posts')
                    ->selectRaw("strftime('%Y-%m', created_at) as month, count(*) as count")
                    ->groupBy('month')
                    ->orderBy('month')
                    ->get())
                ->toNode(),
            $s->action('test')->label('test')->modal('test', $s->row([
                $s->form('chart', [
                  $s->text('asd')->label('Qwewqeq'),
                  $s->action('save')->submit('chart')
                ])
            ])),
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
