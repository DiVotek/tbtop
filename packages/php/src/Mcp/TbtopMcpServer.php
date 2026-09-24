<?php

namespace Tbtop\Admin\Mcp;

use Laravel\Mcp\Server;
use Tbtop\Admin\Mcp\Tools\ExecuteTool;
use Tbtop\Admin\Mcp\Tools\QueryTool;
use Tbtop\Admin\Mcp\Tools\SearchTool;

/** One server class for every panel: the panel comes from the route's SetCurrentPanel. */
final class TbtopMcpServer extends Server
{
    protected string $name = 'Tabletop Admin';

    protected string $version = '1.0.0';

    protected string $instructions = <<<'MARKDOWN'
        An admin panel, acting as the signed-in user with exactly their permissions.
        Start with `search` to list pages and what each offers; `search` with a page (and its params)
        for a record page. Read rows with `query`, then run actions and forms with `execute`.
        MARKDOWN;

    protected array $tools = [
        SearchTool::class,
        QueryTool::class,
        ExecuteTool::class,
    ];
}
