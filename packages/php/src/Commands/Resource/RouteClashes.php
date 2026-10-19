<?php

namespace Tbtop\Admin\Commands\Resource;

use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\PanelRegistry;
use Throwable;

/**
 * Pages already registered on a panel whose path or slug the generated pages
 * would take. A clash makes every request (and every artisan command) fail
 * with "duplicate page path", so the generator refuses before writing.
 *
 * @internal
 */
final class RouteClashes
{
    /** @return list<string> one line per clash, naming the page that holds it */
    public static function find(ResourceNames $names, bool $simple, bool $view): array
    {
        $paths = [$names->path];
        $slugs = [$names->path.'-index'];
        if (! $simple) {
            array_push($paths, $names->path.'/new', $names->path.'/{}/edit');
            array_push($slugs, $names->path.'-create', $names->path.'-edit');
        }
        if ($view) {
            $paths[] = $names->path.'/{}/view';
            $slugs[] = $names->path.'-view';
        }

        $clashes = [];
        foreach (self::existingPages($names->namespace()) as $class) {
            if (in_array(self::normalize($class::path()), $paths, true)) {
                $clashes[] = "path [{$class::path()}] is taken by [{$class}]";
            }
            if (in_array($class::slug(), $slugs, true)) {
                $clashes[] = "slug [{$class::slug()}] is taken by [{$class}]";
            }
        }

        return array_values(array_unique($clashes));
    }

    /** @return list<class-string<Page>> pages outside the resource's own namespace (--force regenerates those) */
    private static function existingPages(string $namespace): array
    {
        $pages = [];
        try {
            foreach (PanelRegistry::fromConfig()->all() as $panel) {
                array_push($pages, ...$panel->getPages());
            }
        } catch (Throwable) {
            return [];
        }

        return array_values(array_filter(array_unique($pages), fn (string $class): bool => ! str_starts_with($class, $namespace.'\\')));
    }

    /** `brands/{brand}/edit` and `brands/{id}/edit` are the same route. */
    private static function normalize(string $path): string
    {
        return (string) preg_replace('/\{[^}]*\}/', '{}', trim($path, '/'));
    }
}
