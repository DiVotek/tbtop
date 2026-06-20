<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Exercises ->softDeletes() end-to-end over SdPost. The table's own delete
 * soft-deletes; the macro adds the trashed tabs + restore/forceDelete actions.
 */
class SoftDeletesPage extends Page
{
    public static function path(): string
    {
        return 'soft-deletes';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('sdposts')
                ->columns(['title' => 'Title'])
                ->searchable(['title'])
                ->query(fn () => SdPost::query())
                ->rowActions([
                    $s->action('delete')->label('Delete')->handle(
                        function (ActionCtx $ctx): Effects {
                            SdPost::whereKey($ctx->row['id'] ?? null)->delete();

                            return Effects::make()->notify('Deleted')->refreshTable('sdposts');
                        },
                        needs: ['row'],
                    ),
                ])
                ->softDeletes($s, SdPost::class)
                ->toNode(),
        ]);
    }
}
