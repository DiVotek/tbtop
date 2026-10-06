<?php

namespace Tbtop\Admin\Auth;

use LogicException;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Shared shell of the package's sign-in screens: public, chrome-less, hidden
 * from MCP, never the panel home. The host publishes subclasses of the
 * concrete bases with `admin:install --auth` and overrides what it needs.
 */
abstract class AuthPage extends Page
{
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

    /**
     * The current panel's page that extends the called class, so one base
     * finds the host's subclass whatever it is named. Null when the panel
     * has none (the host deleted it) or no panel is bound.
     */
    public static function url(): ?string
    {
        $name = static::routeName();

        return $name === null ? null : route($name, absolute: false);
    }

    /** Route name of the current panel's page extending the called class. */
    public static function routeName(): ?string
    {
        $panel = CurrentPanel::current();
        if ($panel === null) {
            return null;
        }
        foreach ($panel->pages() as $class) {
            if (is_a($class, static::class, true)) {
                return 'tbtop.'.$panel->id().'.'.$class::slug();
            }
        }

        return null;
    }

    protected static function panel(): CurrentPanel
    {
        return CurrentPanel::current() ?? throw new LogicException('Auth page served outside a panel.');
    }
}
