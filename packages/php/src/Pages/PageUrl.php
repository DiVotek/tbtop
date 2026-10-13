<?php

namespace Tbtop\Admin\Pages;

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as Router;
use LogicException;
use Tbtop\Admin\Panels\CurrentPanel;

/**
 * Resolves the panel route of a page class for Page::url(). Pages are routed
 * as `tbtop.{panel}.{slug}`; the same class may sit in several panels.
 *
 * @internal
 */
final class PageUrl
{
    /**
     * @param  class-string<Page>  $page
     * @param  array<string, mixed>  $parameters
     */
    public static function to(string $page, array $parameters, ?string $panel, bool $subclasses = false): string
    {
        // From the Route itself: name lookups may not be refreshed outside a request.
        return app('url')->toRoute(self::route($page, $panel, $subclasses), $parameters, false);
    }

    /** @param  class-string<Page>  $page */
    private static function route(string $page, ?string $panel, bool $subclasses): Route
    {
        $candidates = self::candidates($page, $subclasses);
        $wanted = $panel ?? CurrentPanel::current()?->id();

        if ($wanted !== null && isset($candidates[$wanted])) {
            return $candidates[$wanted];
        }
        if ($panel !== null) {
            throw new LogicException("Page [{$page}] is not registered in panel [{$panel}].");
        }
        if (count($candidates) === 1) {
            return array_values($candidates)[0];
        }
        if ($candidates === []) {
            throw new LogicException("Page [{$page}] is not registered in any panel.");
        }

        $ids = implode(', ', array_keys($candidates));

        throw new LogicException("Page [{$page}] is registered in several panels ({$ids}): pass the panel id to url().");
    }

    /**
     * Page routes serving $page (or, with $subclasses, a page extending
     * it), keyed by panel id.
     *
     * @param  class-string<Page>  $page
     * @return array<string, Route>
     */
    private static function candidates(string $page, bool $subclasses): array
    {
        $found = [];

        foreach (Router::getRoutes()->getRoutes() as $route) {
            $served = self::servedPage($route);
            if ($served === null || ! ($served === $page || ($subclasses && is_subclass_of($served, $page)))) {
                continue;
            }
            $name = (string) $route->getName();
            $suffix = '.'.$served::slug();
            if (str_starts_with($name, 'tbtop.') && str_ends_with($name, $suffix)) {
                $found[substr($name, 6, -strlen($suffix))] = $route;
            }
        }

        return $found;
    }

    /** @return class-string<Page>|null the page a GET page route renders */
    private static function servedPage(Route $route): ?string
    {
        $page = $route->defaults['tbtopPage'] ?? null;
        if (! is_string($page) || ! is_subclass_of($page, Page::class) || ! in_array('GET', $route->methods(), true)) {
            return null;
        }

        return $page;
    }
}
