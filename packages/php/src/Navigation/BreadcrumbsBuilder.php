<?php

namespace Tbtop\Admin\Navigation;

use Tbtop\Admin\Pages\Page;

/**
 * Resolves the breadcrumbs array for a given page.
 *
 * Resolution order:
 *  1. Page override via breadcrumbs() — array or Closure.
 *  2. Auto-build: nav-group label (no url) + current page title (no url).
 *  3. Page has no nav() → only the current page title (no url).
 */
final class BreadcrumbsBuilder
{
    /**
     * @return list<array{label: string, url?: string}>
     */
    public static function build(Page $page): array
    {
        // 1. Check for override on the instance
        $override = $page->breadcrumbs();

        if ($override instanceof \Closure) {
            /** @var list<array{label: string, url?: string}> $result */
            $result = $override($page);

            return $result;
        }

        if (is_array($override)) {
            /** @var list<array{label: string, url?: string}> */
            return $override;
        }

        // 2. Auto-build from nav declaration
        return self::fromNav($page);
    }

    /**
     * @return list<array{label: string, url?: string}>
     */
    private static function fromNav(Page $page): array
    {
        $nav = $page::nav();
        $title = $page->title();

        if ($nav === null) {
            // Page is not in nav → single-item crumb (current page only)
            return [['label' => $title]];
        }

        $group = (string) ($nav['group'] ?? 'General');

        // Find if any nav item in this group corresponds to a page with the same path
        // (without route params) — if so, include href on the parent crumb.
        $parentUrl = self::resolveGroupUrl($group, $page);

        $parent = $parentUrl !== null
            ? ['label' => $group, 'url' => $parentUrl]
            : ['label' => $group];

        return [$parent, ['label' => $title]];
    }

    /**
     * Tries to find a page in the same nav group that has no route params and returns
     * its href. Returns null when no such page exists.
     */
    private static function resolveGroupUrl(string $group, Page $skipPage): ?string
    {
        $prefix = '/'.trim((string) config('tbtop-admin.prefix'), '/');
        /** @var list<class-string<Page>> $pages */
        $pages = config('tbtop-admin.pages', []);

        foreach ($pages as $class) {
            if ($class === $skipPage::class) {
                continue;
            }
            $nav = $class::nav();
            if ($nav === null) {
                continue;
            }
            $navGroup = (string) ($nav['group'] ?? 'General');
            if ($navGroup !== $group) {
                continue;
            }
            $path = $class::path();
            if (str_contains($path, '{')) {
                continue;
            }

            return $prefix.'/'.trim($path, '/');
        }

        return null;
    }
}
