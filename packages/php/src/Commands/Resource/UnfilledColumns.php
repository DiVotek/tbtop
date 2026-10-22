<?php

namespace Tbtop\Admin\Commands\Resource;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Columns the generated form never writes (skipped or left as a TODO) that
 * the table still requires: NOT NULL, no default, not filled by Eloquent.
 * A save fails at the database until the host sets them.
 *
 * @internal
 */
final class UnfilledColumns
{
    /**
     * @param  list<ColumnInfo>  $fields
     * @return list<string>
     */
    public static function of(Model $model, array $fields): array
    {
        $todo = array_map(fn (ColumnInfo $c): string => $c->name, array_filter($fields, fn (ColumnInfo $c): bool => in_array($c->kind, ['json', 'other'], true)));
        $byEloquent = [$model->getKeyName(), ...($model->usesTimestamps() ? [$model->getCreatedAtColumn(), $model->getUpdatedAtColumn()] : [])];
        $names = [];
        foreach (Schema::connection($model->getConnectionName())->getColumns($model->getTable()) as $column) {
            $name = (string) $column['name'];
            $unwritten = SkippedColumns::has($model, $name) || in_array($name, $todo, true);
            if ($unwritten && ! in_array($name, $byEloquent, true) && ! $column['nullable'] && $column['default'] === null && ! $column['auto_increment']) {
                $names[] = $name;
            }
        }

        return $names;
    }
}
