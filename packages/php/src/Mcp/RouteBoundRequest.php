<?php

namespace Tbtop\Admin\Mcp;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Facade;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * Calls a page controller with a request matched to its own route, no middleware (adr/mcp.md).
 * Swapped in as app('request') for the call: page view()s read route params through it.
 */
final class RouteBoundRequest
{
    /** Server vars copied from the MCP request: host/scheme for URLs, client identity. */
    private const FORWARDED_SERVER = [
        'REMOTE_ADDR', 'HTTP_HOST', 'HTTPS', 'SERVER_NAME', 'SERVER_PORT',
        'HTTP_USER_AGENT', 'HTTP_ACCEPT_LANGUAGE',
    ];

    /**
     * @template TResult
     *
     * @param  array<string, string>  $routeParams
     * @param  array<string, mixed>  $input  Query string for GET, body for POST.
     * @param  Closure(Request): TResult  $call
     * @return TResult
     */
    public static function run(string $routeName, array $routeParams, string $method, array $input, Closure $call): mixed
    {
        $outer = app('request');
        $request = self::build($outer, $routeName, $routeParams, $method, $input);
        $panel = CurrentPanel::current();

        self::swap($request);
        try {
            return $call($request);
        } finally {
            self::swap($outer);
            if ($panel !== null) {
                app()->instance(CurrentPanel::class, $panel);
            }
        }
    }

    /**
     * route() leaves '/', '?' and '#' unencoded, so such a value could steer the
     * URL onto a sibling page's route and past this page's gate; the name check
     * after matching is what holds, the character check names the bad param.
     *
     * @param  array<string, string>  $routeParams
     * @param  array<string, mixed>  $input
     */
    private static function build(Request $outer, string $routeName, array $routeParams, string $method, array $input): Request
    {
        foreach ($routeParams as $name => $value) {
            if (preg_match('/[\/?#]/', $value) === 1) {
                throw new AgentError("Param \"{$name}\" may not contain '/', '?' or '#'.");
            }
        }
        $server = array_intersect_key($outer->server->all(), array_flip(self::FORWARDED_SERVER));
        $server['HTTP_ACCEPT'] = 'application/json';

        $request = Request::create(route($routeName, $routeParams), $method, $input, [], [], $server);
        $route = app('router')->getRoutes()->match($request);
        if ($route->getName() !== $routeName) {
            throw new AgentError('Invalid params: they do not address this page.');
        }
        $route->bind($request);
        $request->setRouteResolver(static fn () => $route);
        $request->setUserResolver($outer->getUserResolver());

        return $request;
    }

    /** Rebinding 'request' also re-points the URL generator (and so redirects). */
    private static function swap(Request $request): void
    {
        app()->instance('request', $request);
        Facade::clearResolvedInstance('request');
    }
}
