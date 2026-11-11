<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Actions\DeleteAction;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Fields\Boolean;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Pages\Page;

/** Fixture page for BulkSelectAllHttpTest, over the 'ecposts' table the test creates. */
class BulkPostsPage extends Page
{
    public static function path(): string
    {
        return 'bulk-posts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('ecposts')
                ->columns([Column::make('title')->label('Title')->searchable()])
                ->filters([Boolean::make('published')])
                ->tabs([Tab::make('all'), Tab::make('live')->query(fn ($q) => $q->where('status', 'live'))])
                ->headerActions([
                    $s->action('headerMark')->handle(fn (ActionCtx $ctx) => self::mark($ctx), needs: ['selection']),
                ])
                ->bulkActions([
                    $s->action('mark')->handle(fn (ActionCtx $ctx) => self::mark($ctx), needs: ['selection']),
                    $s->dropdown('More', [
                        $s->action('modalMark')->modal('Mark', $s->stack([
                            $s->action('modalMarkSave')->handle(fn (ActionCtx $ctx) => self::mark($ctx), needs: ['selection']),
                        ])),
                    ]),
                    DeleteAction::make($s, fn (ActionCtx $ctx) => EcPost::query()->whereKey($ctx->selection)->delete(), name: 'deleteSelected', bulk: true),
                ])
                ->query(fn () => EcPost::query())
                ->toNode(),
            $s->table('drafts')
                ->columns(['title' => 'Title'])
                ->bulkActions([
                    $s->action('markDrafts')->handle(fn (ActionCtx $ctx) => self::mark($ctx), needs: ['selection']),
                ])
                ->query(fn () => EcPost::query()->where('published', false))
                ->toNode(),
        ]);
    }

    /** Writes how the action saw its selection onto every record it reached. */
    private static function mark(ActionCtx $ctx): Effects
    {
        $ctx->records()->update([
            'note' => ($ctx->allMatching ? 'all' : 'some').':'.count($ctx->selection),
        ]);

        return Effects::make();
    }
}
