<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Database\Eloquent\Builder as ModelBuilder;
use Illuminate\Http\Request;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\TableBuilder;

/**
 * Resolves a bulk action's selection against the table it was made in.
 *
 * The client sends `payload.bulk = {table, all, query}` next to
 * `payload.selection` for an action run from a table. With `all` the user
 * picked every row matching the table's state, so `query` (the table's own
 * query string: tab, search, colSearch, filters) is replayed through
 * TableQuery and $ctx->selection becomes every matching key, read on first
 * access so a records()-only handler never loads them — existing
 * `whereKey($ctx->selection)` handlers keep working. Either way
 * $ctx->records() is the table's query narrowed to the selection.
 *
 * Only a table whose bulk actions hold the action may scope it, the same rule
 * the export endpoint keeps. For any other action (a header action that reads
 * the selection, say) `bulk` is ignored, `all` included: it gets the checked
 * keys, never more, and no records().
 */
final class BulkSelection
{
    /** ActionCtx::fromRequest(), with the selection resolved against its table when the client named one. */
    public static function ctx(Request $request, ResolvedPage $resolved, string $actionName): ActionCtx
    {
        $ctx = ActionCtx::fromRequest($request, ResolvedPage::routeParams($request));
        $bulk = $request->input('payload.bulk');
        if (! is_array($bulk) || ! is_string($bulk['table'] ?? null)) {
            return $ctx;
        }
        $all = ($bulk['all'] ?? false) === true;
        $table = $resolved->s->reachableTable($bulk['table']);
        $base = self::baseQuery($table, $actionName);
        if ($table === null || $base === null) {
            return $ctx;
        }
        if (! $all) {
            $keys = $ctx->selection;

            return $ctx->withRecords($keys, false, fn () => self::whereKeys($base(), $keys));
        }
        $state = Request::create('/', 'GET', self::state($bulk['query'] ?? ''));
        $records = static function () use ($table, $base, $state): EloquentBuilder|QueryBuilder {
            $builder = $base();
            TableQuery::applyState($table, $state, $builder);

            return $builder;
        };

        return $ctx->withRecords(static fn (): array => self::keys($records()), true, $records);
    }

    /** Narrows $builder to $keys: the model key on Eloquent, `id` on a plain query. @param  list<int|string>  $keys */
    public static function whereKeys(EloquentBuilder|QueryBuilder $builder, array $keys): EloquentBuilder|QueryBuilder
    {
        if ($builder instanceof ModelBuilder) {
            return $builder->whereKey($keys);
        }

        return $builder->whereIn('id', $keys);
    }

    /**
     * A factory for the table's fresh base query, or null when the action is
     * not one of its bulk actions or the table has no query builder.
     *
     * @return (Closure(): (EloquentBuilder|QueryBuilder))|null
     */
    private static function baseQuery(?TableBuilder $table, string $actionName): ?Closure
    {
        $query = $table?->queryClosure();
        if ($table === null || $query === null || ! $table->hasBulkAction($actionName)) {
            return null;
        }
        $probe = $query();
        if (! $probe instanceof EloquentBuilder && ! $probe instanceof QueryBuilder) {
            return null;
        }

        return static function () use ($query): EloquentBuilder|QueryBuilder {
            /** @var EloquentBuilder|QueryBuilder */
            return $query();
        };
    }

    /** @return list<int|string> */
    private static function keys(EloquentBuilder|QueryBuilder $builder): array
    {
        $column = $builder instanceof ModelBuilder ? $builder->getModel()->getQualifiedKeyName() : 'id';
        $keys = [];
        foreach ($builder->pluck($column) as $key) {
            if (is_int($key) || is_string($key)) {
                $keys[] = $key;
            }
        }

        return $keys;
    }

    /**
     * The table state from its query string, cleaned as Laravel's TrimStrings
     * and ConvertEmptyStringsToNull clean the table's own GET request, so the
     * same filters match the same rows.
     *
     * @return array<string, mixed>
     */
    private static function state(mixed $query): array
    {
        if (! is_string($query) || $query === '') {
            return [];
        }
        parse_str($query, $state);
        unset($state['page'], $state['perPage']);
        array_walk_recursive($state, static function (mixed &$value): void {
            if (is_string($value)) {
                $value = trim($value);
                $value = $value === '' ? null : $value;
            }
        });

        /** @var array<string, mixed> $state */
        return $state;
    }
}
