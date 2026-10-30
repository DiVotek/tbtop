<?php

namespace Tbtop\Admin\Testing;

use Illuminate\Database\Eloquent\Model;

/**
 * Records as the tester accepts them — a model, a row array, a key — turned
 * into what an action payload carries.
 *
 * @internal
 */
final class Records
{
    /**
     * @param  Model|array<string, mixed>|null  $row
     * @return array<string, mixed>
     */
    public static function row(Model|array|null $row): array
    {
        if ($row instanceof Model) {
            return ['_key' => $row->getKey()];
        }

        return $row ?? [];
    }

    public static function key(mixed $record): int|string
    {
        $key = $record instanceof Model ? $record->getKey() : (is_array($record) ? $record['_key'] ?? $record['id'] ?? null : $record);
        if (! is_int($key) && ! is_string($key)) {
            throw new \InvalidArgumentException('A record is a model, a row with _key or id, or a key; got '.get_debug_type($record).'.');
        }

        return $key;
    }

    /**
     * @param  iterable<mixed>|Model|int|string  $records
     * @return list<int|string>
     */
    public static function keys(iterable|Model|int|string $records): array
    {
        $list = is_iterable($records) ? $records : [$records];
        $keys = [];
        foreach ($list as $record) {
            $keys[] = self::key($record);
        }

        return $keys;
    }
}
