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
     * The key, the shared names, the model's own timestamp and deleted-at columns, whatever the model hides from serialization,
     * and what mass assignment would drop on save. A totally guarded model
     * (no $fillable, default guard) is read as unconfigured and keeps every column.
     */
    public static function has(Model $model, string $column): bool
    {
        $managed = $model->usesTimestamps() ? [$model->getCreatedAtColumn(), $model->getUpdatedAtColumn()] : [];
        if (method_exists($model, 'getDeletedAtColumn')) {
            $managed[] = $model->getDeletedAtColumn();
        }
        if ($column === $model->getKeyName() || in_array($column, [...self::NAMES, ...$managed, ...$model->getHidden()], true)) {
            return true;
        }

        return ! $model->totallyGuarded() && ! $model->isFillable($column);
    }
}
