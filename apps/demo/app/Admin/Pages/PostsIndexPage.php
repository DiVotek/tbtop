<?php

namespace App\Admin\Pages;

use App\Models\Post;
use App\Models\User;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Fields\Boolean;
use Tbtop\Admin\Dsl\Fields\Daterange;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Pages\Page;

class PostsIndexPage extends Page
{
    public static function path(): string
    {
        return 'posts';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Posts', 'order' => 1];
    }

    public function title(): string
    {
        return 'Posts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->actionsRow([
                $s->action('new')->label('New post')->color('primary')->visit('/admin/posts/new'),
            ]),
            $s->table('posts')
            ->rowClick('edit')
                ->columns([
                    Column::make('title')
                        ->label('Title')
                        ->kind('text')
                        ->translatable()
                        ->sortable()
                        ->searchable(),
                    Column::make('slug')
                        ->label('Slug')
                        ->kind('text'),
                    Column::make('published')
                        ->label('Status')
                        ->badge([
                            '1' => Color::Success,
                            '0' => Color::Gray,
                        ])
                        ->toggleable(),
                    Column::make('active')
                        ->label('Active')
                        ->boolean('check', 'x', Color::Success, Color::Gray),
                    Column::make('published_at')
                        ->label('Published')
                        ->date('Y-m-d')
                        ->sortable()
                        ->toggleable(true, true),
                    Column::make('views')
                        ->label('Views')
                        ->number()
                        ->sortable()
                        ->align('right'),
                ])
                ->filters([
                    Select::make('published')
                        ->label('Status')
                        ->options([
                            ['value' => '1', 'label' => 'Published'],
                            ['value' => '0', 'label' => 'Draft'],
                        ]),
                    Select::make('author_id')
                        ->label('Author')
                        ->options(
                            User::query()->pluck('email', 'id')
                                ->map(fn ($email, $id) => ['value' => $id, 'label' => $email])
                                ->values()
                                ->all()
                        ),
                    Daterange::make('published_at')->label('Published date'),
                    Boolean::make('with_rating')
                        ->label('Has rating')
                        ->filterUsing(
                            fn ($q, $v) => $q->when($v, fn ($q) => $q->whereNotNull('rating'))
                        ),
                ])
                ->filtersIn('modal')
                ->tabs([
                    Tab::make('all')->label('All'),
                    Tab::make('published')->label('Published')
                        ->query(fn ($q) => $q->where('published', true)),
                    Tab::make('draft')->label('Draft')
                        ->query(fn ($q) => $q->where('published', false))
                        ->count(),
                ])
                ->defaultSort('created_at', 'desc')
                ->paginate(25, [10, 25, 50, 100])
                ->query(fn () => Post::query())
                ->rowActions([
                    // Visit specs are static strings; a per-row URL needs the
                    // row id, so edit goes through a server redirect effect.
                    $s->action('edit')->label('Edit')->handle(
                        fn (ActionCtx $ctx): Effects => Effects::make()
                            ->redirect("/admin/posts/{$ctx->row['id']}/edit"),
                        needs: ['row'],
                    ),
                    $s->action('delete')->label('Delete')->color('danger')
                        ->confirm('Delete post?', 'This cannot be undone.')
                        ->handle(function (ActionCtx $ctx): Effects {
                            Post::whereKey($ctx->row['id'] ?? null)->delete();

                            return Effects::make()->notify('Post deleted')->refreshTable('posts');
                        }, needs: ['row']),
                ])
                ->bulkActions([
                    $s->action('delete-selected')->label('Delete selected')->color('danger')
                        ->confirm('Delete selected posts?', 'This cannot be undone.')
                        ->handle(function (ActionCtx $ctx): Effects {
                            $count = Post::whereKey($ctx->selection)->delete();

                            return Effects::make()
                                ->notify("Deleted {$count} post(s)")
                                ->refreshTable('posts');
                        }, needs: ['selection']),
                ])
                ->toNode(),
            $s->table('users')
                ->columns([
                    'email' => 'Email',
                    'slug' => 'Slug',
                    'published' => 'Published',
                    'views' => 'Views',
                ])
                ->searchable(['title'])
                ->defaultSort('created_at', 'desc')
                ->query(fn () => User::query()),
        ]);
    }
}
