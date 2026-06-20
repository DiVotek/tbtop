<?php

namespace Tbtop\Admin\Dsl\Actions;

use Closure;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\S;

/**
 * Prebuilt replicate (clone) action — a server action over RecordAction. No
 * model is baked in: the consumer's `using` closure clones the record (e.g.
 * $model->replicate()->save()).
 *
 * Default tail is clone + refreshTable with NO auto-redirect; a consumer wanting
 * edit-after-clone returns a redirect effect from their own closure. Returns the
 * configured ActionBuilder for further chaining.
 */
final class ReplicateAction
{
    /**
     * @param  Closure(ActionCtx): mixed  $using  The clone; void/null falls back to notify+refresh.
     */
    public static function make(S $s, Closure $using, string $name = 'replicate'): ActionBuilder
    {
        return RecordAction::server($s, $name, $using, self::tail())
            ->label('Replicate');
    }

    private static function tail(): Effects
    {
        return Effects::make()->notify('Record replicated')->refreshTable();
    }
}
