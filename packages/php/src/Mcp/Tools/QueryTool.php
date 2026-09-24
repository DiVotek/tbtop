<?php

namespace Tbtop\Admin\Mcp\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Http\JsonResponse;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;
use Tbtop\Admin\Http\TableController;
use Tbtop\Admin\Mcp\PanelPages;
use Tbtop\Admin\Mcp\RouteBoundRequest;

/** Reads a page table through TableController: UI-shaped rows, the table's own paging/filters/search. */
#[IsReadOnly]
final class QueryTool extends Tool
{
    use AnswersAgent;

    protected string $name = 'query';

    protected string $description = <<<'TXT'
        Read rows of a table found by search(). Rows are shaped as the admin UI shows them and carry the
        record key; pass a row unchanged as `row` to execute() for a row action. Filters, search, tabs,
        sort and perPage accept only what search() listed for that table.
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
            'table' => $schema->string()->description('Table name from search().')->required(),
            'params' => $schema->object()->description('Route params of the page.'),
            'pageNumber' => $schema->integer()->description('1-based page of results.'),
            'perPage' => $schema->integer()->description('One of the table\'s pagination options.'),
            'search' => $schema->string()->description('Table-wide search.'),
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

            $query = [];
            foreach (self::QUERY_KEYS as $arg => $key) {
                if ($request->get($arg) !== null) {
                    $query[$key] = $request->get($arg);
                }
            }

            $response = RouteBoundRequest::run(
                $pages->routeName($class, '.table'),
                [...$params, 'tbtopTable' => (string) $request->get('table')],
                'GET',
                $query,
                static fn ($sub): JsonResponse => app(TableController::class)($sub),
            );

            return (array) $response->getData(true)['data'];
        });
    }
}
