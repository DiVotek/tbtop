<?php

namespace Tbtop\Admin\Commands\Resource;

use BackedEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Reads a model's table into ColumnInfo rows: types from Schema::getColumns(),
 * uniqueness from single-column unique indexes, relations from foreign keys,
 * enums and translatable attributes from the model itself.
 *
 * @internal
 */
final class SchemaReader
{
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
        $foreign = ForeignKeys::read($schema->getForeignKeys($table), $connection, $model);
        $translatable = self::translatable($model);
        $casts = $model->getCasts();

        $columns = [];
        foreach ($schema->getColumns($table) as $column) {
            $name = (string) $column['name'];
            if (SkippedColumns::has($model, $name)) {
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
            preg_match('/^((tiny|small|medium|big)?int(eger)?[248]?|(small|big)?serial[248]?)$/', $typeName) === 1 => 'integer',
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
