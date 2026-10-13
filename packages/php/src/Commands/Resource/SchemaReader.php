<?php

namespace Tbtop\Admin\Commands\Resource;

use BackedEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Reads a model's table into ColumnInfo rows: types from Schema::getColumns(),
 * uniqueness from single-column unique indexes, relations from foreign keys,
 * enums and translatable attributes from the model itself.
 *
 * @internal
 */
final class SchemaReader
{
    /** Never a form field: keys, bookkeeping and secrets. */
    public const SKIPPED = ['created_at', 'updated_at', 'deleted_at', 'password', 'remember_token', 'email_verified_at'];

    private const LABEL_KEYS = ['name', 'title', 'label', 'email'];

    /** @return list<ColumnInfo>|null null when the table does not exist */
    public static function read(Model $model): ?array
    {
        $table = $model->getTable();
        $connection = $model->getConnectionName();
        $schema = Schema::connection($connection);
        if (! $schema->hasTable($table)) {
            return null;
        }

        $unique = self::uniqueColumns($schema->getIndexes($table));
        $foreign = self::foreignKeys($schema->getForeignKeys($table), $connection, $model);
        $translatable = self::translatable($model);
        $casts = $model->getCasts();

        $columns = [];
        foreach ($schema->getColumns($table) as $column) {
            $name = (string) $column['name'];
            if ($name === $model->getKeyName() || in_array($name, self::SKIPPED, true)) {
                continue;
            }
            $columns[] = new ColumnInfo(
                name: $name,
                kind: self::kind((string) $column['type_name'], (string) $column['type'], $casts[$name] ?? null, in_array($name, $translatable, true)),
                length: self::length((string) $column['type']),
                nullable: (bool) $column['nullable'],
                default: is_scalar($column['default']) ? (string) $column['default'] : null,
                unique: in_array($name, $unique, true),
                translatable: in_array($name, $translatable, true),
                enum: self::enumCast($casts[$name] ?? null),
                foreign: $foreign[$name] ?? null,
            );
        }

        return $columns;
    }

    /** @return 'string'|'text'|'integer'|'decimal'|'boolean'|'date'|'datetime'|'time'|'json'|'other' */
    private static function kind(string $typeName, string $type, mixed $cast, bool $translatable): string
    {
        $typeName = strtolower($typeName);
        $type = strtolower($type);
        if ($translatable) {
            // A locale map stored as json/text: each locale is one line of text.
            return 'string';
        }
        if (is_string($cast) && self::isStructuredCast($cast)) {
            return 'json';
        }

        return match (true) {
            in_array($typeName, ['bool', 'boolean'], true), $type === 'tinyint(1)' => 'boolean',
            in_array($typeName, ['varchar', 'char', 'string', 'nvarchar', 'nchar', 'bpchar', 'character varying', 'character', 'uuid', 'enum'], true) => 'string',
            str_contains($typeName, 'text'), $typeName === 'clob' => 'text',
            str_contains($typeName, 'int') => 'integer',
            in_array($typeName, ['decimal', 'numeric', 'float', 'double', 'real', 'float4', 'float8', 'money'], true) => 'decimal',
            $typeName === 'date' => 'date',
            in_array($typeName, ['datetime', 'timestamp', 'timestamptz', 'datetime2', 'datetimeoffset'], true) => 'datetime',
            in_array($typeName, ['time', 'timetz'], true) => 'time',
            in_array($typeName, ['json', 'jsonb'], true) => 'json',
            default => 'other',
        };
    }

    private static function isStructuredCast(string $cast): bool
    {
        $base = strtolower(explode(':', $cast)[0]);

        return in_array($base, ['array', 'json', 'object', 'collection', 'encrypted:array', 'encrypted:collection', 'encrypted:object'], true)
            || str_contains($base, 'asarrayobject') || str_contains($base, 'ascollection');
    }

    private static function length(string $type): ?int
    {
        return preg_match('/^(?:n?varchar|n?char|character varying|character)\((\d+)\)$/i', $type, $m) === 1 ? (int) $m[1] : null;
    }

    /**
     * Names of columns covered by a single-column unique index.
     *
     * @param  list<array<string, mixed>>  $indexes
     * @return list<string>
     */
    private static function uniqueColumns(array $indexes): array
    {
        $names = [];
        foreach ($indexes as $index) {
            $columns = (array) $index['columns'];
            if (($index['unique'] ?? false) && ! ($index['primary'] ?? false) && count($columns) === 1) {
                $names[] = (string) $columns[0];
            }
        }

        return $names;
    }

    /**
     * Single-column foreign keys by local column.
     *
     * @param  list<array<string, mixed>>  $keys
     * @return array<string, array{table: string, column: string, model: class-string|null, labelKey: string, relation: string|null}>
     */
    private static function foreignKeys(array $keys, ?string $connection, Model $owner): array
    {
        $found = [];
        foreach ($keys as $key) {
            $columns = (array) $key['columns'];
            if (count($columns) !== 1) {
                continue;
            }
            $table = (string) $key['foreign_table'];
            $local = (string) $columns[0];
            $found[$local] = [
                'table' => $table,
                'column' => (string) ((array) $key['foreign_columns'])[0],
                'model' => self::modelFor($table),
                'labelKey' => self::labelKey($table, $connection),
                'relation' => self::relationFor($owner, $local),
            ];
        }

        return $found;
    }

    /** The owner's belongsTo method for $column (author_id → author()), when it has one. */
    private static function relationFor(Model $owner, string $column): ?string
    {
        $method = Str::camel((string) preg_replace('/_id$/', '', $column));

        return $method !== $column && method_exists($owner, $method) ? $method : null;
    }

    /** @return class-string|null */
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

    /** @return list<string> */
    private static function translatable(Model $model): array
    {
        if (! method_exists($model, 'getTranslatableAttributes')) {
            return [];
        }

        return array_values(array_map('strval', (array) $model->getTranslatableAttributes()));
    }

    /** @return class-string|null */
    private static function enumCast(mixed $cast): ?string
    {
        return is_string($cast) && is_subclass_of($cast, BackedEnum::class) ? $cast : null;
    }
}
