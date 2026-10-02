<?php

namespace Tbtop\Admin\Mcp;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tbtop\Admin\Panels\PanelRegistry;

/**
 * MCP streamable HTTP requires the server to validate Origin (DNS rebinding).
 * No Origin means a non-browser client and passes; a browser origin must be
 * the app's own or listed in PanelConfig::mcpAllowedOrigins(), else 403.
 */
final class ValidateMcpOrigin
{
    public function __construct(private readonly PanelRegistry $registry) {}

    public function handle(Request $request, Closure $next, string $panelId): Response
    {
        $origin = $request->headers->get('Origin');
        if ($origin === null || $origin === '') {
            return $next($request);
        }
        $allowed = [$request->getSchemeAndHttpHost(), ...$this->registry->get($panelId)->getMcpAllowedOrigins()];
        if (in_array(self::normalize($origin), array_map(self::normalize(...), $allowed), true)) {
            return $next($request);
        }

        return response()->json([
            'jsonrpc' => '2.0',
            'error' => ['code' => -32600, 'message' => "Origin \"{$origin}\" is not allowed for this MCP server."],
        ], 403);
    }

    private static function normalize(string $origin): string
    {
        return strtolower(rtrim($origin, '/'));
    }
}
