<?php

namespace Tbtop\Admin\Mcp\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Http\JsonResponse;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;
use Tbtop\Admin\Http\ResolvedPage;
use Tbtop\Admin\Http\TableController;
use Tbtop\Admin\Mcp\AgentError;
use Tbtop\Admin\Mcp\FieldOptions;
use Tbtop\Admin\Mcp\PanelPages;
use Tbtop\Admin\Mcp\RouteBoundRequest;
use Tbtop\Admin\Mcp\TableArguments;

/**
 * Reads a page table through TableController: UI-shaped rows, the table's own
 * paging/filters/search. The page gate runs first, then arguments are checked
 * against what search() lists for the table (TableArguments).
 */
#[IsReadOnly]
final class QueryTool extends Tool
{
    use AnswersAgent;

    protected string $name = 'query';

    protected string $description = <<<'TXT'
        Read rows of a table found by search(). A row is what the admin table receives: its key
        (`id` for Eloquent models) and its visible columns, formatted; no other record attributes.
        Pass a row unchanged as `row` to execute() for a row action, or keys as `selection`. Filters take
        the value shape search() states per filter; search, columnSearch, filters, tabs, sort and perPage
        accept only what search() listed for that table, and anything else is refused.
        For a field or filter whose options are "dynamic", the same tool lists its choices: pass
        `executable` + `field` (a form field) or `table` + `filter`, with an optional `search` text and
        `deps` ({parent: value} for every name in the field's dependsOn). Returns {options: [{value,
        label}]}, capped like the UI's type-ahead: narrow with search.
        TXT;

    /** Tool argument => the table endpoint's query key. */
    private const QUERY_KEYS = [
        'pageNumber' => 'page', 'perPage' => 'perPage', 'search' => 'search', 'columnSearch' => 'colSearch',
        'filters' => 'filters', 'tab' => 'tab', 'sort' => 'sort', 'dir' => 'dir',
    ];

    public function schema(JsonSchema $schema): array
    {
        return [
            'page' => $schema->string()->description('Page slug.')->required(),
            'table' => $schema->string()->description('Table name from search(): its rows, or with filter its options.'),
            'executable' => $schema->string()->description('Executable id whose form holds field, for an options lookup.'),
            'field' => $schema->string()->description('Field name as search() lists it, for an options lookup.'),
            'filter' => $schema->string()->description('Filter name of table, for an options lookup.'),
            'deps' => $schema->object()->description('Parent values for a field\'s dependsOn: {parent: value}.'),
            'params' => $schema->object()->description('Route params of the page, values as strings.'),
            'pageNumber' => $schema->integer()->description('1-based page of results.'),
            'perPage' => $schema->integer()->description('One of the table\'s pagination options.'),
            'search' => $schema->string()->description('Table-wide search, or the option search of a lookup.'),
            'columnSearch' => $schema->object()->description('Per-column search: {column: text}.'),
            'filters' => $schema->object()->description('Filter values keyed by filter name.'),
            'tab' => $schema->string()->description('Filter tab name.'),
            'sort' => $schema->string()->description('Sortable column name.'),
            'dir' => $schema->string()->enum(['asc', 'desc']),
        ];
    }

    public function handle(Request $request): Response
    {
        return $this->answer(function () use ($request): array {
            $pages = PanelPages::current();
            $class = $pages->find((string) $request->get('page'));
            $params = PanelPages::routeParams($class, self::objectArg($request->get('params')));
            $resolved = $pages->resolve($class, $params);
            $options = self::optionsLookup($resolved, $request);
            if ($options !== null) {
                return $options;
            }
            $name = (string) $request->get('table');
            $table = $resolved->s->reachableTable($name);
            if ($table?->queryClosure() === null) {
                throw new AgentError("Table \"{$name}\" has no query on this page.");
            }

            $args = [];
            foreach (array_keys(self::QUERY_KEYS) as $arg) {
                $args[$arg] = $request->get($arg);
            }
            $args = TableArguments::check($table, $args);
            $query = [];
            foreach (self::QUERY_KEYS as $arg => $key) {
                if ($args[$arg] !== null) {
                    $query[$key] = $args[$arg];
                }
            }

            $response = RouteBoundRequest::run(
                $pages->routeName($class, '.table'),
                [...$params, 'tbtopTable' => $name],
                'GET',
                $query,
                static fn ($sub): JsonResponse => app(TableController::class)($sub),
            );

            return (array) $response->getData(true)['data'];
        });
    }

    /**
     * The options lookup's answer, or null when the call reads rows.
     *
     * @return array{options: list<array{value: mixed, label: mixed}>}|null
     */
    private static function optionsLookup(ResolvedPage $resolved, Request $request): ?array
    {
        $table = $request->get('table');
        $executable = $request->get('executable');
        $field = $request->get('field');
        $filter = $request->get('filter');
        if ($table !== null && ($executable !== null || $field !== null)) {
            throw new AgentError('Pass either table (with filter for options) or executable with field, not both.');
        }
        if (($executable === null) !== ($field === null) || ($filter !== null && $table === null)) {
            throw new AgentError('field and executable go together; filter needs table.');
        }
        if ($table === null && $executable === null) {
            throw new AgentError('Pass table, or executable with field.');
        }
        if ($executable === null && $filter === null) {
            return null;
        }
        foreach (['pageNumber', 'perPage', 'columnSearch', 'filters', 'tab', 'sort', 'dir'] as $arg) {
            if ($request->get($arg) !== null) {
                throw new AgentError('Row arguments do not apply to an options lookup.');
            }
        }
        $search = (string) $request->get('search');
        $deps = self::objectArg($request->get('deps'));
        if ($executable !== null) {
            return FieldOptions::ofField($resolved, (string) $executable, (string) $field, $search, $deps);
        }
        $reachable = $resolved->s->reachableTable((string) $table);
        if ($reachable === null) {
            throw new AgentError("Table \"{$table}\" is not on this page.");
        }

        return FieldOptions::ofFilter($reachable, (string) $filter, $search, $deps);
    }
}
