<?php

namespace Tbtop\Admin\Http;

use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder as BaseBuilder;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Summary;
use Tbtop\Admin\Dsl\TableBuilder;

/**
 * Column summaries for one table response: the footer over every matching
 * row, and per row group over that group's rows. Built-ins run as SQL
 * aggregates on a clone of the filtered query (sort dropped, no pagination);
 * a custom Summary::using() closure gets that clone and returns its value.
 * Values are keyed by column name, one entry per summary in declared order.
 */
final class TableSummaries
{
    /** @return array<string, list<mixed>>|null Null when no visible column summarizes. */
    public static function footer(TableBuilder $table, EloquentBuilder|QueryBuilder $filtered): ?array
    {
        $columns = $table->summarizedColumns();
        if ($columns === []) {
            return null;
        }
        $out = [];
        foreach ($columns as $column) {
            foreach ($column->getSummaries() as $summary) {
                $out[$column->name][] = self::one($column, $summary, self::fresh($filtered));
            }
        }

        return $out;
    }

    /**
     * Puts each row group's summaries on the first projected row of its run,
     * under `_groupSummary`. Runs are found on the raw group value, the way
     * the client partitions rows; a table without groups() passes through.
     *
     * @param  iterable<int, mixed>  $rows  The page's raw rows
     * @param  list<mixed>  $projected  The same rows after ColumnProjection
     * @return list<mixed>
     */
    public static function attachGroups(TableBuilder $table, EloquentBuilder|QueryBuilder $filtered, iterable $rows, array $projected): array
    {
        $groupColumn = $table->getGroupsColumn();
        if ($groupColumn === null) {
            return $projected;
        }
        $starts = [];
        $previous = null;
        $index = 0;
        foreach ($rows as $row) {
            $value = $row instanceof Model && array_key_exists($groupColumn, $row->getAttributes())
                ? $row->getRawOriginal($groupColumn)
                : data_get($row, $groupColumn);
            if ($index === 0 || self::key($value) !== self::key($previous)) {
                $starts[$index] = $value;
            }
            $previous = $value;
            $index++;
        }
        $unique = [];
        foreach ($starts as $value) {
            $unique[self::key($value)] = $value;
        }
        $entries = self::groups($table, $filtered, array_values($unique)) ?? [];
        $byKey = array_combine(array_keys($unique), $entries);
        foreach ($starts as $i => $value) {
            data_set($projected[$i], '_groupSummary', $byKey[self::key($value)] ?? []);
        }

        return $projected;
    }

    /**
     * Summaries per group value, for the group values on the current page.
     * Built-ins come from one GROUP BY query; a custom closure runs once per
     * group on the query narrowed to it.
     *
     * @param  list<mixed>  $values  Raw group-column values present on the page
     * @return list<array<string, list<mixed>>>|null One entry per $values item, same order
     */
    public static function groups(TableBuilder $table, EloquentBuilder|QueryBuilder $filtered, array $values): ?array
    {
        $columns = $table->summarizedColumns();
        $groupColumn = $table->getGroupsColumn();
        if ($columns === [] || $groupColumn === null || $values === []) {
            return null;
        }
        $aggregates = self::groupedAggregates($columns, $filtered, $groupColumn, $values);

        $out = [];
        foreach ($values as $value) {
            $out[] = self::groupEntry($columns, $filtered, $groupColumn, $value, $aggregates[self::key($value)] ?? []);
        }

        return $out;
    }

    /**
     * @param  list<Column>  $columns
     * @param  array<string, mixed>  $aggregates  alias => raw aggregate for this group
     * @return array<string, list<mixed>>
     */
    private static function groupEntry(array $columns, EloquentBuilder|QueryBuilder $filtered, string $groupColumn, mixed $value, array $aggregates): array
    {
        $entry = [];
        foreach ($columns as $c => $column) {
            foreach ($column->getSummaries() as $s => $summary) {
                $using = $summary->usingClosure();
                if ($using !== null) {
                    $entry[$column->name][] = $using(self::narrow(self::fresh($filtered), $groupColumn, $value));

                    continue;
                }
                $entry[$column->name][] = self::format($column, $summary->type, $aggregates[self::alias($c, $s)] ?? null);
            }
        }

        return $entry;
    }

    /**
     * @param  list<Column>  $columns
     * @param  list<mixed>  $values
     * @return array<string, array<string, mixed>> group key => alias => raw aggregate
     */
    private static function groupedAggregates(array $columns, EloquentBuilder|QueryBuilder $filtered, string $groupColumn, array $values): array
    {
        $query = self::base(self::fresh($filtered));
        $grammar = $query->getGrammar();
        $selects = [$grammar->wrap($groupColumn).' as '.$grammar->wrap('__group')];
        foreach ($columns as $c => $column) {
            foreach ($column->getSummaries() as $s => $summary) {
                if ($summary->usingClosure() === null) {
                    $selects[] = self::sqlAggregate($summary->type, $grammar->wrap($column->name)).' as '.$grammar->wrap(self::alias($c, $s));
                }
            }
        }
        $query->selectRaw(implode(', ', $selects));
        self::whereValues($query, $groupColumn, $values);
        $query->groupBy($groupColumn);

        $out = [];
        foreach ($query->get() as $row) {
            $row = (array) $row;
            $out[self::key($row['__group'] ?? null)] = $row;
        }

        return $out;
    }

    /** @param  list<mixed>  $values */
    private static function whereValues(BaseBuilder $query, string $column, array $values): void
    {
        $present = array_values(array_filter($values, fn ($v) => $v !== null));
        $hasNull = count($present) !== count($values);
        $query->where(function (BaseBuilder $q) use ($column, $present, $hasNull): void {
            if ($present !== []) {
                $q->whereIn($column, $present);
            }
            if ($hasNull) {
                $q->orWhereNull($column);
            }
        });
    }

    private static function sqlAggregate(string $type, string $wrapped): string
    {
        return match ($type) {
            'sum' => "SUM({$wrapped})",
            'avg' => "AVG({$wrapped})",
            'min' => "MIN({$wrapped})",
            'max' => "MAX({$wrapped})",
            default => 'COUNT(*)',
        };
    }

    private static function one(Column $column, Summary $summary, EloquentBuilder|QueryBuilder $query): mixed
    {
        $using = $summary->usingClosure();
        if ($using !== null) {
            return $using($query);
        }
        $base = self::base($query);
        $raw = match ($summary->type) {
            'sum' => $base->sum($column->name),
            'avg' => $base->avg($column->name),
            'min' => $base->min($column->name),
            'max' => $base->max($column->name),
            default => $base->count(),
        };

        return self::format($column, $summary->type, $raw);
    }

    /**
     * Count is a plain integer; the others format like the column's cells.
     * An average rounds to two decimals unless money() or number($decimals) formats it.
     */
    private static function format(Column $column, string $type, mixed $raw): mixed
    {
        if ($type === 'count') {
            return (int) $raw;
        }
        if ($type === 'sum' && $raw === null) {
            $raw = 0;
        }
        $value = is_numeric($raw) ? $raw + 0 : $raw;
        $kind = $column->getKind() ?? '';
        $meta = $column->getKindMeta();
        if ($type === 'avg' && is_float($value) && $kind !== 'money' && ! isset($meta['decimals'])) {
            $value = round($value, 2);
        }

        return KindFormat::apply($kind, $meta, $value);
    }

    private static function fresh(EloquentBuilder|QueryBuilder $filtered): EloquentBuilder|QueryBuilder
    {
        $clone = clone $filtered;
        $clone->reorder();

        return $clone;
    }

    private static function base(EloquentBuilder|QueryBuilder $query): BaseBuilder
    {
        /** @var BaseBuilder $base */
        $base = $query instanceof EloquentBuilder ? $query->toBase() : $query;

        return $base;
    }

    private static function narrow(EloquentBuilder|QueryBuilder $query, string $column, mixed $value): EloquentBuilder|QueryBuilder
    {
        $value === null ? $query->whereNull($column) : $query->where($column, $value);

        return $query;
    }

    private static function alias(int $column, int $summary): string
    {
        return "__s{$column}_{$summary}";
    }

    private static function key(mixed $value): string
    {
        return $value === null ? "\0null" : (string) (is_bool($value) ? (int) $value : $value);
    }
}
