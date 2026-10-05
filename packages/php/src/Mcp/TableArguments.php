<?php

namespace Tbtop\Admin\Mcp;

use Closure;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\TableFilterApplier;

/**
 * What a table offers an agent, as search() lists it, and the check query()
 * runs against that same listing: an argument the table does not offer is
 * refused instead of being silently ignored by TableQuery.
 */
final class TableArguments
{
    /**
     * search()'s description of $table. `sortable` includes the default-sort
     * field, which TableSortApplier always allows.
     *
     * @return array<string, mixed>
     */
    public static function describe(TableBuilder $table): array
    {
        $sortable = $table->sortableColumnNames();
        $default = $table->defaultSortSpec()['field'] ?? null;
        if ($default !== null && ! in_array($default, $sortable, true)) {
            $sortable[] = $default;
        }

        return array_filter([
            'table' => $table->name,
            'columns' => array_map(
                static fn (Column $c): array => array_filter(['name' => $c->name, 'label' => $c->labelText()]),
                $table->visibleColumns(),
            ),
            'search' => $table->searchableFields(),
            'columnSearch' => $table->individuallySearchableColumns(),
            'filters' => array_map(
                static fn (Field $f): array => array_filter([
                    'name' => $f->name,
                    'kind' => $f->toNode()->kind,
                    'label' => $f->labelText(),
                    'value' => TableFilterApplier::valueShape($f),
                    'options' => FormArguments::options($f),
                ]),
                $table->filterFields(),
            ),
            'tabs' => array_map(static fn (Tab $t): string => $t->name, $table->tabObjects()),
            'sortable' => $sortable,
            'pagination' => $table->paginationSpec(),
        ], static fn (mixed $v): bool => $v !== []);
    }

    /**
     * Refuses a sort, dir, perPage, filter, columnSearch or search that
     * describe() does not list, or a search text that is not text (TableQuery
     * casts it to a string). `""`, null and `{}` count as not sent, as
     * TableQuery treats them. `dir` alone sorts by the default-sort field.
     *
     * @param  array<string, mixed>  $args  query() arguments by tool name
     * @return array<string, mixed> $args to forward, `sort` filled in for a lone `dir`
     */
    public static function check(TableBuilder $table, array $args): array
    {
        $described = self::describe($table);
        $name = $table->name;
        $args = self::checkSort($table, $described['sortable'] ?? [], $args);
        self::checkPerPage($described['pagination'], $args['perPage'] ?? null);
        self::checkNames($args['filters'] ?? null, array_column($described['filters'] ?? [], 'name'), static fn (string $key): string => "Unknown filter \"{$key}\" for table \"{$name}\".");
        self::checkNames($args['columnSearch'] ?? null, $described['columnSearch'] ?? [], static fn (string $key): string => "Column \"{$key}\" is not searchable in table \"{$name}\".");
        self::checkSearch($name, isset($described['search']), $args['search'] ?? null, $args['columnSearch'] ?? null);

        return $args;
    }

    /**
     * @param  list<string>  $sortable
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    private static function checkSort(TableBuilder $table, array $sortable, array $args): array
    {
        $sort = $args['sort'] ?? null;
        if (self::isSent($sort) && ! in_array($sort, $sortable, true)) {
            throw new AgentError('Unknown sort "'.self::text($sort)."\" for table \"{$table->name}\".");
        }
        $dir = $args['dir'] ?? null;
        if (self::isSent($dir) && ! in_array($dir, ['asc', 'desc'], true)) {
            throw new AgentError('dir must be "asc" or "desc".');
        }
        if (self::isSent($sort) || ! self::isSent($dir)) {
            return $args;
        }
        $default = $table->defaultSortSpec()['field'] ?? null;
        if ($default === null) {
            throw new AgentError("dir needs sort for table \"{$table->name}\".");
        }

        return [...$args, 'sort' => $default];
    }

    /** Table-wide and per-column search text: a string or number, as TableQuery casts it. */
    private static function checkSearch(string $name, bool $hasSearch, mixed $search, mixed $columnSearch): void
    {
        if (self::isSent($search) && ! $hasSearch) {
            throw new AgentError("Table \"{$name}\" has no search.");
        }
        if (self::isSent($search) && ! self::isText($search)) {
            throw new AgentError("search must be text for table \"{$name}\".");
        }
        foreach (is_array($columnSearch) ? $columnSearch : [] as $column => $text) {
            if ($text !== null && ! self::isText($text)) {
                throw new AgentError("columnSearch \"{$column}\" must be text for table \"{$name}\".");
            }
        }
    }

    /** @param  array{perPage: int, options: list<int>}  $pagination */
    private static function checkPerPage(array $pagination, mixed $perPage): void
    {
        $allowed = array_values(array_unique([...$pagination['options'], $pagination['perPage']]));
        sort($allowed);
        if (! self::isSent($perPage) || (is_numeric($perPage) && in_array((int) $perPage, $allowed, true))) {
            return;
        }

        throw new AgentError('perPage '.self::text($perPage).' is not one of '.implode(', ', $allowed).'.');
    }

    /**
     * @param  list<string>  $allowed
     * @param  Closure(string): string  $message  the refusal for a name not in $allowed
     */
    private static function checkNames(mixed $sent, array $allowed, Closure $message): void
    {
        if (! is_array($sent)) {
            return;
        }
        foreach (array_keys($sent) as $key) {
            if (! in_array((string) $key, $allowed, true)) {
                throw new AgentError($message((string) $key));
            }
        }
    }

    private static function isSent(mixed $value): bool
    {
        return $value !== null && $value !== '' && $value !== [];
    }

    private static function isText(mixed $value): bool
    {
        return is_string($value) || is_int($value) || is_float($value);
    }

    private static function text(mixed $value): string
    {
        return is_scalar($value) ? (string) $value : (string) json_encode($value);
    }
}
