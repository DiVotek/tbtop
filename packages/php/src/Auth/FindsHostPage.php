<?php

namespace Tbtop\Admin\Auth;

use LogicException;
use Tbtop\Admin\Pages\PageUrl;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * Lookup of the host's subclass of a package base page, whatever the host
 * named it: the published auth pages are found through their base class.
 */
trait FindsHostPage
{
    /**
     * URL of the host's page extending the called class, whatever it is named.
     * Same panel rules as Page::url(); throws when no panel has one. Use
     * currentUrl() where "no panel, no page" must fall back instead.
     *
     * @param  array<string, mixed>  $parameters
     */
    public static function url(array $parameters = [], ?string $panel = null): string
    {
        return PageUrl::to(static::class, $parameters, $panel, subclasses: true);
    }

    /**
     * The current panel's page that extends the called class, so one base
     * finds the host's subclass whatever it is named. Null when the panel
     * has none (the host deleted it) or no panel is bound.
     */
    public static function currentUrl(): ?string
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
