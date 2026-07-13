<?php

namespace Tbtop\Admin\Dsl\Actions;

use Closure;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\S;

/**
 * Prebuilt delete action — a danger-styled, confirmed server action over
 * RecordAction. No model is baked in: the consumer's `using` closure runs the
 * actual delete (e.g. Post::whereKey($ctx->row['id'])->delete()).
 *
 * Returns the configured ActionBuilder so label/icon/confirm/color stay
 * overridable by chaining tbtop's fluent API.
 */
final class DeleteAction
{
    /**
     * @param  Closure(ActionCtx): mixed  $using  The delete; void/null falls back to notify+refresh.
     * @param  bool  $bulk  Operate on the selection (needs:['selection']) instead of a single row.
     */
    public static function make(S $s, Closure $using, string $name = 'delete', bool $bulk = false): ActionBuilder
    {
        $builder = $bulk
            ? RecordAction::bulk($s, $name, $using, self::bulkTail())
            : RecordAction::server($s, $name, $using, self::rowTail());

        $label = $bulk
            ? __('tbtop-admin::admin.action.delete_selected')
            : __('tbtop-admin::admin.action.delete');

        return $builder
            ->label($label)
            ->color('danger')
            ->confirm(...self::confirmCopy($bulk));
    }

    /** @return array{0: string, 1: string} */
    private static function confirmCopy(bool $bulk): array
    {
        $title = $bulk
            ? __('tbtop-admin::admin.delete.confirm.bulk_title')
            : __('tbtop-admin::admin.delete.confirm.title');

        return [$title, __('tbtop-admin::admin.delete.confirm.body')];
    }

    private static function rowTail(): Effects
    {
        return Effects::make()->notify(__('tbtop-admin::admin.delete.notify.success'))->refreshTable();
    }

    private static function bulkTail(): Effects
    {
        return Effects::make()->notify(__('tbtop-admin::admin.delete.notify.bulk_success'))->refreshTable();
    }
}
