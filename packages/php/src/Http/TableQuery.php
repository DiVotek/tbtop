<?php

namespace Tbtop\Admin\Http;

use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Tbtop\Admin\Dsl\TableBuilder;

final class TableQuery
{
    private const MAX_PER_PAGE = 100;

    /** @return array{data: mixed, total: int} */
    public static function run(TableBuilder $table, Request $request, EloquentBuilder|QueryBuilder $builder): array
    {
        self::applySearch($table, $request, $builder);
        self::applyFilters($request, $builder);
        self::applySort($table, $request, $builder);

        $perPage = min(max((int) $request->query('perPage', '25'), 1), self::MAX_PER_PAGE);
        $page = max((int) $request->query('page', '1'), 1);
        $total = (clone $builder)->count();
        $rows = $builder->forPage($page, $perPage)->get();

        return ['data' => TranslatableProjection::apply($table, $rows), 'total' => $total];
    }

    private static function applySearch(TableBuilder $table, Request $request, EloquentBuilder|QueryBuilder $builder): void
    {
        $search = (string) $request->query('search', '');
        $fields = $table->searchableFields();
        if ($search === '' || $fields === []) {
            return;
        }
        $builder->where(function (EloquentBuilder|QueryBuilder $q) use ($fields, $search): void {
            foreach ($fields as $field) {
                $q->orWhere($field, 'like', "%{$search}%");
            }
        });
    }

    private static function applyFilters(Request $request, EloquentBuilder|QueryBuilder $builder): void
    {
        $filters = $request->query('filters', []);
        if (! is_array($filters)) {
            return;
        }
        foreach ($filters as $field => $value) {
            if (is_string($field) && $value !== null && $value !== '') {
                $builder->where($field, $value);
            }
        }
    }

    private static function applySort(TableBuilder $table, Request $request, EloquentBuilder|QueryBuilder $builder): void
    {
        $default = $table->defaultSortSpec();
        $sort = (string) $request->query('sort', $default['field'] ?? '');
        $dir = (string) $request->query('dir', $default['dir'] ?? 'asc');
        if ($sort === '') {
            return;
        }
        $builder->orderBy($sort, $dir === 'desc' ? 'desc' : 'asc');
    }
}
