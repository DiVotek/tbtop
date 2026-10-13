<?php

namespace Tbtop\Admin\Commands\Resource;

use Illuminate\Database\Eloquent\Model;

/**
 * Columns that never become a form field or a table column.
 *
 * @internal
 */
final class SkippedColumns
{
    /** Bookkeeping and secrets every Laravel app shares. */
    public const NAMES = ['created_at', 'updated_at', 'deleted_at', 'password', 'remember_token', 'email_verified_at'];

    /**
     * The key, the shared names, whatever the model hides from serialization,
     * and what it explicitly guards (a model with no $fillable guards nothing in particular).
     */
    public static function has(Model $model, string $column): bool
    {
        if ($column === $model->getKeyName() || in_array($column, [...self::NAMES, ...$model->getHidden()], true)) {
            return true;
        }

        return ! $model->totallyGuarded() && $model->isGuarded($column);
    }
}
