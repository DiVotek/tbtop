<?php

namespace App\Admin\Pages;

use App\Models\Post;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Actions\DeleteAction;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Soft-delete demo over Post (which uses the SoftDeletes trait). The table's
 * own Delete action soft-deletes; ->softDeletes() then layers the
 * active/trashed/all tabs plus restore/forceDelete row + bulk actions.
 */
class SoftDeletesDemoPage extends Page
{
    public static function path(): string
    {
        return 'soft-deletes';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Soft deletes', 'order' => 5];
    }

    public function title(): string
    {
        return 'Soft deletes';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('posts')
                ->columns([
                    Column::make('title')->label('Title')->kind('text')->translatable()->searchable(),
                    Column::make('published')->label('Published')->boolean(),
                ])
                ->searchable(['title'])
                ->defaultSort('id', 'desc')
                ->query(fn () => Post::query())
                ->rowActions([
                    // Prebuilt delete; the using closure returns the load-bearing
                    // "moves to Trashed" copy + named refreshTable over the tail.
                    DeleteAction::make($s, using: function (ActionCtx $ctx): Effects {
                        Post::whereKey($ctx->row['id'] ?? null)->delete();

                        return Effects::make()->notify('Post deleted')->refreshTable('posts');
                    })->confirm('Delete post?', 'It moves to the Trashed tab.'),
                ])
                ->softDeletes($s, Post::class)
                ->toNode(),
        ]);
    }
}
