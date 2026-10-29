<?php

namespace App\Admin\Pages;

use App\Models\Post;
use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Stat;
use Tbtop\Admin\Notifications\Notification;
use Tbtop\Admin\Notifications\NotificationAction;
use Tbtop\Admin\Pages\Page;

class DashboardPage extends Page
{
    public static function path(): string
    {
        return 'dashboard';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Overview', 'label' => 'Dashboard', 'order' => 0, 'icon' => 'home'];
    }

    public static function can(): ?string
    {
        return 'view-dashboard';
    }

    public function title(): string
    {
        return 'Dashboard';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $this->statsRow($s),
            $this->latestPosts($s),
            $this->notifyDemo($s),
            $this->chartsGrid($s),
            $this->displayShowcase($s),
        ]);
    }

    private function latestPosts(S $s): Node
    {
        return $s->stack([
            $s->displayText('Latest posts')->variant('heading'),
            $s->displayText('Refreshes every 10 seconds: a post created in another tab shows up here on its own.')->variant('muted'),
            $s->table('latestPosts')
                ->columns([
                    Column::make('title')->label('Title')->translatable(),
                    Column::make('status')
                        ->label('Status')
                        ->formatUsing(fn ($value, Post $post) => $post->published ? 'published' : 'draft')
                        ->badge([
                            'published' => ['label' => 'Live', 'color' => Color::Success],
                            'draft' => ['label' => 'Draft', 'color' => Color::Gray],
                        ]),
                    Column::make('created_at')->label('Created')->datetime(),
                ])
                ->query(fn () => Post::query()->latest('id'))
                ->paginate(5, [5])
                ->embedded()
                ->poll(10),
        ]);
    }

    private function notifyDemo(S $s): Node
    {
        return $s->stack([
            $s->displayText('Notifications')->variant('heading'),
            $s->displayText('Send yourself a database notification, then watch the header bell pick it up on its next poll.')->variant('muted'),
            $s->action('send-test-notification')
                ->label('Send test notification')
                ->icon('star')
                ->handle(function () {
                    $user = auth()->user();
                    if ($user !== null) {
                        Notification::make()
                            ->title('Welcome to the admin')
                            ->body('This is a database notification, delivered through the header bell.')
                            ->success()
                            ->actions([NotificationAction::make('Open dashboard')->url('/admin/dashboard')])
                            ->sendToDatabase($user);
                    }

                    return Effects::make()->notify('Test notification sent');
                }),
        ]);
    }

    private function statsRow(S $s): Node
    {
        $totalPosts = fn () => DB::table('posts')->count();
        $published = fn () => DB::table('posts')->where('published', true)->count();
        $draft = fn () => DB::table('posts')->where('published', false)->count();
        $recentTrend = fn (array $params) => DB::table('posts')
            ->selectRaw('count(*) as n')
            ->whereRaw("created_at >= date('now', ?)", ['-'.(int) $params['months'].' months'])
            ->value('n') ?? 0;

        return $s->grid(['cols' => 4], [
            Stat::make('Total Posts')
                ->value($totalPosts)
                ->description('All time')
                ->icon('file-text')
                ->color(Color::Primary)
                ->toNode(),

            Stat::make('Published')
                ->value($published)
                ->description('Live posts')
                ->icon('globe')
                ->color(Color::Success)
                ->toNode(),

            Stat::make('Drafts')
                ->value($draft)
                ->description('Unpublished')
                ->icon('pencil')
                ->color(Color::Warning)
                ->toNode(),

            $s->stat('Recent posts')
                ->params([
                    $s->select('months')->options([
                        ['value' => '1', 'label' => 'Last month'],
                        ['value' => '6', 'label' => 'Last 6 months'],
                        ['value' => '12', 'label' => 'Last year'],
                    ])->default('6')->rules('in:1,6,12'),
                ])
                ->value($recentTrend)
                ->description('Posts created recently')
                ->icon('clock')
                ->color(Color::Info)
                ->toNode(),
        ]);
    }

    private function displayShowcase(S $s): Node
    {
        return $s->stack([
            $s->displayDivider(),
            $s->displayText('Display Blocks')->variant('heading'),
            $s->displayText('A compact tour of every display primitive.')->variant('muted'),
            $s->displayText('Body text renders at the default size.')->variant('body'),
            $s->displayAlert('This is an informational notice.')
                ->title('Info')
                ->color(Color::Info),
            $s->displayAlert('Post published successfully.')
                ->title('Success')
                ->color(Color::Success),
            $s->displayAlert('Draft quota is almost full.')
                ->title('Warning')
                ->color(Color::Warning),
            $s->displayDivider(),
            $s->displayHtml('<p><strong>HTML</strong> block: sanitized server-side, <em>safe markup</em> only. Chain ->trusted() for author-owned HTML.</p>'),
        ]);
    }

    private function chartsGrid(S $s): Node
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
                        'day' => '%Y-%m-%d',
                        'week' => '%Y-W%W',
                        default => '%Y-%m',
                    };

                    return DB::table('posts')
                        ->selectRaw('strftime(?, created_at) as period, count(*) as count', [$format])
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
                ->query(fn () => DB::table('posts')
                    ->selectRaw("case when published = 1 then 'Published' else 'Draft' end as status, count(*) as total")
                    ->groupBy('published')
                    ->orderBy('total')
                    ->get())
                ->toNode(),
        ]);
    }
}
