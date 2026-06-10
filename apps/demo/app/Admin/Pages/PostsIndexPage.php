<?php

namespace App\Admin\Pages;

use App\Models\Post;
use App\Models\User;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
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
                ->columns([
                    'title' => 'Title',
                    'slug' => 'Slug',
                    'published' => 'Published',
                    'views' => 'Views',
                ])
                ->searchable(['title'])
                ->defaultSort('created_at', 'desc')
                ->query(fn() => Post::query())
                ->rowActions([
                    // Visit specs are static strings; a per-row URL needs the
                    // row id, so edit goes through a server redirect effect.
                    $s->action('edit')->label('Edit')->handle(
                        fn(ActionCtx $ctx): Effects => Effects::make()
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
                ->query(fn() => User::query())
        ]);
    }
}
