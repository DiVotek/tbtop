<?php

namespace Tbtop\Admin\Mcp;

use Illuminate\Support\Facades\Route;
use Laravel\Mcp\Facades\Mcp;
use Laravel\Mcp\Server\Registrar;
use LogicException;
use Tbtop\Admin\Http\SetAdminLocale;
use Tbtop\Admin\Http\SetCurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;

/** Registers `{prefix}/mcp` for a panel with mcp() on; its stack replaces the panel's (adr/mcp.md). */
final class McpRoute
{
    public const PATH = 'mcp';

    public static function register(PanelConfig $panel): void
    {
        if (! class_exists(Registrar::class)) {
            throw new LogicException("Panel \"{$panel->getId()}\" enables mcp(), which needs laravel/mcp: composer require laravel/mcp");
        }
        foreach ($panel->getPages() as $class) {
            if (trim($class::path(), '/') === self::PATH || $class::slug() === self::PATH) {
                throw new LogicException("Page {$class} uses the path or slug \"".self::PATH."\", reserved for the panel's MCP server.");
            }
        }

        Route::middleware([
            SetCurrentPanel::class.':'.$panel->getId(),
            ...($panel->getMcpMiddleware() ?? []),
            SetAdminLocale::class,
        ])
            ->prefix($panel->getPrefix())
            ->name('tbtop.'.$panel->getId().'.')
            ->group(static function (): void {
                Mcp::web(self::PATH, TbtopMcpServer::class)->name('mcp');
            });
    }
}
