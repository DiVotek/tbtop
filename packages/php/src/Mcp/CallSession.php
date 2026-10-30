<?php

namespace Tbtop\Admin\Mcp;

use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;

/**
 * The session an MCP request's tool calls share: in memory, never saved, scoped
 * to the request (Octane and queue workers flush it). Upload paths RemoteFiles
 * issues are seen by IssuedUploadPath, and form effects are read back from its
 * flash; nothing leaks into the app's session store or into the next request.
 */
final class CallSession
{
    public function __construct(public readonly Store $store) {}

    public static function store(): Store
    {
        return app(self::class)->store;
    }

    public static function make(): self
    {
        return new self(new Store('tbtop-mcp', new ArraySessionHandler(1)));
    }
}
