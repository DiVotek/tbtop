<?php

namespace Tbtop\Admin\Commands\Resource;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use ReflectionMethod;
use Throwable;

/**
 * A table's single-column foreign keys: the related model (from the owner's
 * relation, else App\\Models\\{Singular}), its label column, and the relation.
 *
 * @internal
 */
final class ForeignKeys
{
    private const LABEL_KEYS = ['name', 'title', 'label', 'email'];

    /**
     * Single-column foreign keys by local column.
     *
     * @param  list<array<string, mixed>>  $keys
     * @return array<string, array{table: string, column: string, model: class-string|null, labelKey: string, relation: string|null}>
     */
    public static function read(array $keys, ?string $connection, Model $owner): array
    {
        $found = [];
        foreach ($keys as $key) {
            $columns = (array) $key['columns'];
            if (count($columns) !== 1) {
                continue;
            }
            $table = (string) $key['foreign_table'];
            $local = (string) $columns[0];
            $relation = self::relationFor($owner, $local);
            $found[$local] = [
                'table' => $table,
                'column' => (string) ((array) $key['foreign_columns'])[0],
                'model' => $relation[1] ?? self::modelFor($table),
                'labelKey' => self::labelKey($table, $connection),
                'relation' => $relation[0] ?? null,
            ];
        }

        return $found;
    }

    /**
     * The owner's relation for $column (author_id → author()) and the model it
     * points at, when the method is one.
     *
     * @return array{0: string, 1: class-string<Model>}|null
     */
    private static function relationFor(Model $owner, string $column): ?array
    {
        $method = Str::camel((string) preg_replace('/_id$/', '', $column));
        if ($method === $column || ! method_exists($owner, $method) || (new ReflectionMethod($owner, $method))->getNumberOfRequiredParameters() > 0) {
            return null;
        }
        try {
            $relation = $owner->{$method}();

            return $relation instanceof Relation ? [$method, $relation->getRelated()::class] : null;
        } catch (Throwable) {
            return null;
        }
    }

    /** Fallback when no relation names the model: App\\Models\\{Singular}. @return class-string|null */
    private static function modelFor(string $table): ?string
    {
        $class = rtrim(app()->getNamespace(), '\\').'\\Models\\'.Str::studly(Str::singular($table));

        return class_exists($class) && is_subclass_of($class, Model::class) ? $class : null;
    }

    private static function labelKey(string $table, ?string $connection): string
    {
        $columns = Schema::connection($connection)->getColumnListing($table);
        foreach (self::LABEL_KEYS as $candidate) {
            if (in_array($candidate, $columns, true)) {
                return $candidate;
            }
        }

        return 'id';
    }
}
