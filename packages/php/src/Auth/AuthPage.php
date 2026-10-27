<?php

namespace Tbtop\Admin\Auth;

use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Shared shell of the package's sign-in screens: public, chrome-less, hidden
 * from MCP, never the panel home. The host publishes subclasses of the
 * concrete bases with `admin:install --auth` and overrides what it needs.
 */
abstract class AuthPage extends Page
{
    use FindsHostPage;

    /** Public, but a user already signed in on the panel's guard is sent into the panel. */
    public static function middleware(PanelConfig $panel): array
    {
        return ['web', RedirectSignedInUsers::class];
    }

    /** Signing in needs a browser session, which MCP calls do not carry. */
    public static function mcp(): bool
    {
        return false;
    }

    public function layout(): string
    {
        return 'center';
    }
}
