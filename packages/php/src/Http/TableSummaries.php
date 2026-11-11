<?php

namespace Tbtop\Admin\Http;

use Closure;
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
     * under `_groupSummary`. Runs are found on the projected group value, the
     * way the client partitions rows, so a formatted group column (a datetime
     * shown as a date) keeps one subtotal per displayed group, over the stored
     * values that make it up. A table without groups() passes through.
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
        $runs = [];
        $start = 0;
        $index = 0;
        foreach ($rows as $row) {
            $shown = data_get($projected[$index], $groupColumn);
            if ($index === 0 || $shown !== data_get($projected[$index - 1], $groupColumn)) {
                $start = $index;
            }
            $raw = $row instanceof Model && array_key_exists($groupColumn, $row->getAttributes())
                ? $row->getRawOriginal($groupColumn)
                : data_get($row, $groupColumn);
            $runs[$start][self::key($raw)] = $raw;
            $index++;
        }
        $entries = self::groups($table, $filtered, array_map(array_values(...), array_values($runs))) ?? [];
        foreach (array_keys($runs) as $n => $i) {
            data_set($projected[$i], '_groupSummary', $entries[$n] ?? []);
        }

        return $projected;
    }

    /**
     * Summaries per row group on the current page. A group is one stored value
     * or, for a formatted group column, the stored values shown alike. Built-ins
     * for single-value groups come from one GROUP BY query; other groups and
     * custom closures run on the query narrowed to the group's values.
     *
     * @param  list<list<mixed>>  $groups  Each group's raw group-column values
     * @return list<array<string, list<mixed>>>|null One entry per group, same order
     */
    public static function groups(TableBuilder $table, EloquentBuilder|QueryBuilder $filtered, array $groups): ?array
    {
        $columns = $table->summarizedColumns();
        $groupColumn = $table->getGroupsColumn();
        if ($columns === [] || $groupColumn === null || $groups === []) {
            return null;
        }
        $single = array_merge(...array_filter($groups, fn (array $values) => count($values) === 1));
        $aggregates = $single === [] ? [] : self::groupedAggregates($columns, $filtered, $groupColumn, $single);

        $out = [];
        foreach ($groups as $values) {
            $narrowed = fn () => self::narrow(self::fresh($filtered), $groupColumn, $values);
            // A value the GROUP BY keyed differently (e.g. a case-insensitive collation) runs on its own.
            $grouped = count($values) === 1 ? ($aggregates[self::key($values[0])] ?? null) : null;
            $out[] = self::groupEntry($columns, $narrowed, $grouped);
        }

        return $out;
    }

    /**
     * @param  list<Column>  $columns
     * @param  Closure(): (EloquentBuilder|QueryBuilder)  $narrowed  A fresh query over this group's rows
     * @param  array<string, mixed>|null  $aggregates  alias => raw aggregate from the GROUP BY query; null computes each one
     * @return array<string, list<mixed>>
     */
    private static function groupEntry(array $columns, Closure $narrowed, ?array $aggregates): array
    {
        $entry = [];
        foreach ($columns as $c => $column) {
            foreach ($column->getSummaries() as $s => $summary) {
                $entry[$column->name][] = $aggregates === null || $summary->usingClosure() !== null
                    ? self::one($column, $summary, $narrowed())
                    : self::format($column, $summary->type, $aggregates[self::alias($c, $s)] ?? null);
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
        $query->columns = null; // the host's select() would leak into GROUP BY
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
    private static function whereValues(EloquentBuilder|QueryBuilder $query, string $column, array $values): void
    {
        $present = array_values(array_filter($values, fn ($v) => $v !== null));
        $hasNull = count($present) !== count($values);
        $query->where(function ($q) use ($column, $present, $hasNull): void {
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
        $kind = $column->getKind() ?? '';
        // SQL returns SUM/AVG (and DECIMAL min/max) as strings; a text min/max like '007' stays as stored.
        $numeric = in_array($type, ['sum', 'avg'], true) || in_array($kind, ['number', 'money'], true);
        $value = $numeric && is_numeric($raw) ? $raw + 0 : $raw;
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

    /** @param  list<mixed>  $values */
    private static function narrow(EloquentBuilder|QueryBuilder $query, string $column, array $values): EloquentBuilder|QueryBuilder
    {
        self::whereValues($query, $column, $values);

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
