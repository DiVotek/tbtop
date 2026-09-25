<?php

namespace Tbtop\Admin\Panels\Concerns;

use InvalidArgumentException;

/**
 * Opt-in MCP server for PanelConfig (requires laravel/mcp). Server-only: none
 * of this reaches the Inertia share or the wire. See docs/ai/wiring.md → MCP server.
 */
trait ConfiguresMcp
{
    /** @var list<string>|null */
    private ?array $mcpMiddleware = null;

    private string $mcpPath = 'mcp';

    /**
     * Expose this panel to AI agents over MCP at `POST {prefix}/{$path}` (needs
     * `composer require laravel/mcp`). $middleware is the route's whole auth and
     * access stack — it REPLACES the panel's middleware, which does not run for
     * MCP calls: name stateless token auth and repeat the panel's role checks,
     * e.g. `['auth:sanctum', 'abilities:tbtop-mcp', 'role:admin']`. A page's own
     * restriction belongs in Page::can(), which MCP enforces. An empty list
     * throws: it would serve the panel without authentication.
     *
     * @param  list<string>  $middleware
     */
    public function mcp(array $middleware, string $path = 'mcp'): static
    {
        if ($middleware === []) {
            throw new InvalidArgumentException('mcp() needs auth middleware, e.g. [\'auth:sanctum\']: an empty stack serves the panel without authentication.');
        }
        $this->mcpMiddleware = $middleware;
        $this->mcpPath = trim($path, '/');

        return $this;
    }

    public function hasMcp(): bool
    {
        return $this->mcpMiddleware !== null;
    }

    /** Middleware for the MCP route, or null when mcp() was never called. @return list<string>|null */
    public function getMcpMiddleware(): ?array
    {
        return $this->mcpMiddleware;
    }

    /** URI of the MCP route under the panel prefix. */
    public function getMcpPath(): string
    {
        return $this->mcpPath;
    }
}
