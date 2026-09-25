<?php

namespace Tbtop\Admin\Mcp;

use Illuminate\Support\Facades\Route;
use Laravel\Mcp\Facades\Mcp;
use Laravel\Mcp\Server\Registrar;
use LogicException;
use Tbtop\Admin\Http\SetAdminLocale;
use Tbtop\Admin\Http\SetCurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;

/** Registers `{prefix}/{mcp path}` for a panel with mcp() on; its stack replaces the panel's (adr/mcp.md). */
final class McpRoute
{
    public static function register(PanelConfig $panel): void
    {
        if (! class_exists(Registrar::class)) {
            throw new LogicException("Panel \"{$panel->getId()}\" enables mcp(), which needs laravel/mcp: composer require laravel/mcp");
        }
        $path = $panel->getMcpPath();
        foreach ($panel->getPages() as $class) {
            if (trim($class::path(), '/') === $path || $class::slug() === 'mcp') {
                throw new LogicException("Page {$class} collides with the panel's MCP server (path \"{$path}\", route name \"mcp\").");
            }
        }

        Route::middleware([
            SetCurrentPanel::class.':'.$panel->getId(),
            ...($panel->getMcpMiddleware() ?? []),
            SetAdminLocale::class,
        ])
            ->prefix($panel->getPrefix())
            ->name('tbtop.'.$panel->getId().'.')
            ->group(static function () use ($path): void {
                Mcp::web($path, TbtopMcpServer::class)->name('mcp');
            });
    }
}
