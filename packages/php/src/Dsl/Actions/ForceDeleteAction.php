<?php

namespace Tbtop\Admin\Dsl\Actions;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\S;

/**
 * Prebuilt force-delete action for soft-deleting models — a danger-styled,
 * confirmed server action over RecordAction that permanently removes a row.
 * The model is baked in so the handler can reach trashed rows via withTrashed().
 *
 * Returns the configured ActionBuilder so label/icon/confirm/color stay
 * overridable by chaining tbtop's fluent API.
 */
final class ForceDeleteAction
{
    /**
     * @param  class-string  $model  A model using the SoftDeletes trait.
     */
    public static function make(S $s, string $model, string $name = 'forceDelete'): ActionBuilder
    {
        return RecordAction::server(
            $s,
            $name,
            fn (ActionCtx $ctx) => $model::withTrashed()->whereKey($ctx->row['id'] ?? null)->firstOrFail()->forceDelete(),
            Effects::make()->notify('Deleted permanently')->refreshTable(),
        )->label('Delete permanently')->color('danger')->confirm('Delete permanently?', 'This cannot be undone.');
    }

    /**
     * @param  class-string  $model  A model using the SoftDeletes trait.
     */
    public static function bulk(S $s, string $model, string $name = 'forceDeleteSelected'): ActionBuilder
    {
        return RecordAction::bulk(
            $s,
            $name,
            fn (ActionCtx $ctx) => $model::withTrashed()->whereKey($ctx->selection)->forceDelete(),
            Effects::make()->notify('Deleted selected permanently')->refreshTable(),
        )->label('Delete permanently')->color('danger')->confirm('Delete permanently?', 'This cannot be undone.');
    }
}
