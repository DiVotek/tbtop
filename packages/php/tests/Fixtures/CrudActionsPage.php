<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Actions\DeleteAction;
use Tbtop\Admin\Dsl\Actions\EditAction;
use Tbtop\Admin\Dsl\Actions\ReplicateAction;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Exercises the prebuilt CRUD helpers end-to-end over CaPost. Every consumer
 * closure returns void on purpose, to prove the RecordAction default tail.
 */
class CrudActionsPage extends Page
{
    public static function path(): string
    {
        return 'crud-actions';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            EditAction::make(
                $s,
                form: $s->form('editCaPost', [
                    $s->text('title')->label('Title'),
                    $s->boolean('published')->label('Published'),
                ]),
                loadUsing: fn (ActionCtx $ctx): array => CaPost::query()
                    ->whereKey($ctx->row['id'] ?? null)
                    ->firstOrFail()
                    ->only(['title', 'published']),
                saveUsing: function (ActionCtx $ctx): void {
                    CaPost::whereKey($ctx->row['id'] ?? null)->update([
                        'title' => $ctx->form['title'] ?? '',
                        'published' => (bool) ($ctx->form['published'] ?? false),
                    ]);
                },
            ),
            DeleteAction::make($s, using: function (ActionCtx $ctx): void {
                CaPost::whereKey($ctx->row['id'] ?? null)->delete();
            }),
            DeleteAction::make($s, name: 'delete-selected', bulk: true, using: function (ActionCtx $ctx): void {
                CaPost::whereKey($ctx->selection)->delete();
            }),
            ReplicateAction::make($s, using: function (ActionCtx $ctx): void {
                CaPost::query()->whereKey($ctx->row['id'] ?? null)->firstOrFail()
                    ->replicate()->save();
            }),
        ]);
    }
}
