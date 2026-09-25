<?php

namespace Tbtop\Admin\Panels\Concerns;

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
     * `composer require laravel/mcp`). $middleware REPLACES the panel's
     * middleware on that route — use stateless token auth (the default is
     * `auth:sanctum`), and repeat any access check the panel or its pages keep
     * in middleware, since those do not run for MCP calls.
     *
     * @param  list<string>  $middleware
     */
    public function mcp(array $middleware = ['auth:sanctum'], string $path = 'mcp'): static
    {
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
