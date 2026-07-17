<?php

namespace Tbtop\Admin\Dsl\Actions;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\S;

/**
 * Prebuilt restore action for soft-deleting models — a server action over
 * RecordAction that brings a trashed row back. The model is baked in so the
 * handler can reach hidden rows via withTrashed() (the global SoftDeletes
 * scope would otherwise 404 the lookup).
 *
 * Returns the configured ActionBuilder so label/icon/color stay overridable
 * by chaining tbtop's fluent API.
 */
final class RestoreAction
{
    /**
     * @param  class-string  $model  A model using the SoftDeletes trait.
     */
    public static function make(S $s, string $model, string $name = 'restore'): ActionBuilder
    {
        return RecordAction::server(
            $s,
            $name,
            fn (ActionCtx $ctx) => $model::withTrashed()->whereKey($ctx->row['id'] ?? null)->firstOrFail()->restore(),
            Effects::make()->notify(__('tbtop-admin::admin.restore.notify.success'))->refreshTable(),
        )->label(__('tbtop-admin::admin.action.restore'))->color('gray');
    }

    /**
     * @param  class-string  $model  A model using the SoftDeletes trait.
     */
    public static function bulk(S $s, string $model, string $name = 'restoreSelected'): ActionBuilder
    {
        return RecordAction::bulk(
            $s,
            $name,
            fn (ActionCtx $ctx) => $model::withTrashed()->whereKey($ctx->selection)->restore(),
            Effects::make()->notify(__('tbtop-admin::admin.restore.notify.bulk_success'))->refreshTable(),
        )->label(__('tbtop-admin::admin.action.restore'))->color('gray');
    }
}
