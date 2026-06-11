<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Dsl\TableBuilder;

final class TableQuery
{
    /** @return array{data: mixed, total: int, page: int, perPage: int} */
    public static function run(TableBuilder $table, Request $request, EloquentBuilder|QueryBuilder $builder): array
    {
        self::applyTab($table, $request, $builder);
        self::applySearch($table, $request, $builder);
        self::applyFilters($table, $request, $builder);
        self::applySort($table, $request, $builder);

        $pagination = $table->paginationSpec();
        $allowedPerPage = $pagination['options'];
        $defaultPerPage = $pagination['perPage'];

        $requestedPerPage = (int) $request->query('perPage', (string) $defaultPerPage);
        $perPage = in_array($requestedPerPage, $allowedPerPage, true) ? $requestedPerPage : $defaultPerPage;
        $page = max((int) $request->query('page', '1'), 1);
        $total = (clone $builder)->count();
        $rows = $builder->forPage($page, $perPage)->get();

        return [
            'data' => ColumnProjection::apply($table, $rows),
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
        ];
    }

    /**
     * Counts for count-enabled tabs, each computed on a fresh base builder
     * with only that tab's scope applied — runtime filters/search never
     * affect the badge numbers. Null when no declared tab opted in.
     *
     * @return array<string, int>|null
     */
    public static function tabCounts(TableBuilder $table, Closure $freshQuery): ?array
    {
        $countTabs = array_filter($table->tabObjects(), fn (Tab $t) => $t->hasCount());
        if ($countTabs === []) {
            return null;
        }

        $counts = [];
        foreach ($countTabs as $tab) {
            $builder = $freshQuery();
            if (! $builder instanceof EloquentBuilder && ! $builder instanceof QueryBuilder) {
                continue;
            }
            $scope = $tab->queryClosure();
            if ($scope !== null) {
                $scope($builder);
            }
            $counts[$tab->name] = $builder->count();
        }

        return $counts;
    }

    /**
     * Tab scope composes with (and applies before) filters/search/sort.
     * No tab param → first declared tab. Unknown tab name → 422.
     */
    private static function applyTab(TableBuilder $table, Request $request, EloquentBuilder|QueryBuilder $builder): void
    {
        $tab = self::resolveTab($table, $request);
        $scope = $tab?->queryClosure();
        if ($scope !== null) {
            $scope($builder);
        }
    }

    private static function resolveTab(TableBuilder $table, Request $request): ?Tab
    {
        $requested = $request->query('tab');
        if (! is_string($requested) || $requested === '') {
            return $table->defaultTab();
        }

        $tab = $table->findTab($requested);
        if ($tab === null) {
            throw new UnprocessableEntityHttpException(
                "Unknown tab \"{$requested}\" for table \"{$table->name}\"."
            );
        }

        return $tab;
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

    private static function applyFilters(TableBuilder $table, Request $request, EloquentBuilder|QueryBuilder $builder): void
    {
        $raw = $request->query('filters', []);
        if (! is_array($raw)) {
            return;
        }
        /** @var array<string, mixed> $filterValues */
        $filterValues = $raw;
        $fields = $table->filterFields();
        if ($fields !== []) {
            TableFilterApplier::apply($fields, $filterValues, $builder);
        } else {
            // Legacy: no declared filter fields — fall back to simple equality.
            foreach ($filterValues as $field => $value) {
                if ($value !== null && $value !== '') {
                    $builder->where($field, $value);
                }
            }
        }
    }

    private static function applySort(TableBuilder $table, Request $request, EloquentBuilder|QueryBuilder $builder): void
    {
        $default = $table->defaultSortSpec();
        $requestedSort = (string) $request->query('sort', '');
        $dir = (string) $request->query('dir', $default['dir'] ?? 'asc');

        // Security whitelist: only allow explicitly declared sortable columns.
        // The default-sort field is always implicitly allowed.
        $allowed = $table->sortableColumnNames();
        $defaultField = $default['field'] ?? null;

        if ($requestedSort !== '') {
            $isAllowed = in_array($requestedSort, $allowed, true)
                || ($defaultField !== null && $requestedSort === $defaultField);

            if ($isAllowed) {
                $builder->orderBy($requestedSort, $dir === 'desc' ? 'desc' : 'asc');

                return;
            }
        }

        // Fall through to default sort
        if ($defaultField !== null) {
            $builder->orderBy($defaultField, $default['dir'] ?? 'asc');
        }
    }
}
