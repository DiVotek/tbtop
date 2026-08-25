<?php

namespace Tbtop\Admin\Http;

use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Tbtop\Admin\Dsl\TableBuilder;

/**
 * Applies the requested (or default) sort to a query builder, honoring the
 * declared sortable whitelist and each column's sortBy()/sortUsing() overrides.
 */
final class TableSortApplier
{
    public static function apply(TableBuilder $table, Request $request, EloquentBuilder|QueryBuilder $builder): void
    {
        $default = $table->defaultSortSpec();
        $requestedSort = (string) $request->query('sort', '');
        $dir = (string) $request->query('dir', $default['dir'] ?? 'asc');
        $direction = $dir === 'desc' ? 'desc' : 'asc';

        // Security whitelist: only allow explicitly declared sortable columns.
        // The default-sort field is always implicitly allowed.
        $allowed = $table->sortableColumnNames();
        $defaultField = $default['field'] ?? null;

        if ($requestedSort !== '') {
            $isAllowed = in_array($requestedSort, $allowed, true)
                || ($defaultField !== null && $requestedSort === $defaultField);

            if ($isAllowed) {
                self::orderByColumn($table, $builder, $requestedSort, $direction);

                return;
            }
        }

        // Fall through to default sort
        if ($defaultField !== null) {
            self::orderByColumn($table, $builder, $defaultField, $default['dir'] ?? 'asc');
        }
    }

    /**
     * Dispatch order: sortUsing() closure (full control) → sortBy() target
     * field → the column's own name, resolved as a relation dot-path via
     * RelationSortResolver when possible, else a plain orderBy().
     *
     * @param  'asc'|'desc'  $direction
     */
    private static function orderByColumn(
        TableBuilder $table,
        EloquentBuilder|QueryBuilder $builder,
        string $columnName,
        string $direction,
    ): void {
        $column = $table->findColumn($columnName);

        $sortUsing = $column?->sortUsingClosure();
        if ($sortUsing !== null) {
            $sortUsing($builder, $direction);

            return;
        }

        $target = $column?->sortByField() ?? $columnName;

        if ($builder instanceof EloquentBuilder) {
            $subquery = RelationSortResolver::resolve($builder, $target);
            if ($subquery !== null) {
                $builder->orderBy($subquery, $direction);

                return;
            }
        }

        $builder->orderBy($target, $direction);
    }
}
