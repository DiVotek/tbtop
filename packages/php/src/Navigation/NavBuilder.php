<?php

namespace Tbtop\Admin\Navigation;

use Illuminate\Support\Facades\Gate;
use InvalidArgumentException;
use LogicException;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\CurrentPanel;

final class NavBuilder
{
    /**
     * Builds the sidebar tree from the panel's pages' nav() declarations plus
     * any panel-level navigationItems(). Pages with route params, null nav(),
     * or a failing gate are skipped. A nav()['parent'] nests a page under
     * another page's item (unknown/cyclic parents throw at build time); a
     * page whose parent is gated out for the current user promotes to its
     * own group's top level instead of vanishing. Per-item icon/badge come
     * from nav(); per-group icon/collapsible come from navigationGroups(),
     * matched by label. Groups follow navigationGroups()'s declared order,
     * with undeclared groups keeping their first-seen order, sorted last.
     *
     * @return list<array<string, mixed>>
     */
    public static function build(CurrentPanel $panel): array
    {
        $prefix = $panel->pathPrefix();
        $entries = self::collectPages($panel->pages(), $prefix);

        self::assertValidParents($entries);

        $childrenOf = [];
        foreach ($entries as $class => $entry) {
            if ($entry['parent'] !== null) {
                $childrenOf[$entry['parent']][] = $class;
            }
        }

        $groups = [];
        foreach ($entries as $class => $entry) {
            if (! self::gatePasses($entry['can'])) {
                continue;
            }
            if ($entry['parent'] !== null && self::gatePasses($entries[$entry['parent']]['can'])) {
                continue;
            }
            $groups[$entry['group']][] = self::buildNode($class, $entries, $childrenOf);
        }

        foreach ($panel->navigationItems() as $item) {
            $groups[$item->getGroup() ?? 'General'][] = self::customItemFrom($item);
        }

        return self::assemble($groups, $panel->navigationGroups());
    }

    /**
     * Resolves every nav()-eligible page into its wire item plus the
     * placement metadata (group/parent/gate) build() needs, keyed by class
     * for parent lookups.
     *
     * @param  list<class-string<Page>>  $classes
     * @return array<class-string<Page>, array{group: string, item: array<string, mixed>, parent: class-string<Page>|null, can: string|null}>
     */
    private static function collectPages(array $classes, string $prefix): array
    {
        $entries = [];
        foreach ($classes as $class) {
            $nav = $class::nav();
            $path = $class::path();
            if ($nav === null || str_contains($path, '{')) {
                continue;
            }
            $parent = $nav['parent'] ?? null;
            $entries[$class] = [
                'group' => (string) ($nav['group'] ?? 'General'),
                'item' => self::itemFrom($nav, $prefix.'/'.trim($path, '/'), $class),
                'parent' => $parent !== null ? (string) $parent : null,
                'can' => $class::can(),
            ];
        }

        return $entries;
    }

    /**
     * Throws when a nav()['parent'] references a page outside this panel's
     * nav-eligible set, or when parent links form a cycle. Runs before any
     * gating so a typo fails the same way for every visitor.
     *
     * @param  array<class-string<Page>, array{parent: class-string<Page>|null}>  $entries
     */
    private static function assertValidParents(array $entries): void
    {
        foreach ($entries as $class => $entry) {
            if ($entry['parent'] !== null && ! isset($entries[$entry['parent']])) {
                throw new InvalidArgumentException(
                    "Page {$class} declares nav()['parent'] => {$entry['parent']}, which is not a "
                    .'nav-eligible page in this panel (missing from pages(), has no nav(), or has a route parameter).',
                );
            }
        }
        foreach (array_keys($entries) as $class) {
            self::assertNoCycle($class, $entries, [$class => true]);
        }
    }

    /**
     * @param  class-string<Page>  $class
     * @param  array<class-string<Page>, array{parent: class-string<Page>|null}>  $entries
     * @param  array<class-string<Page>, true>  $seen
     */
    private static function assertNoCycle(string $class, array $entries, array $seen): void
    {
        $parent = $entries[$class]['parent'] ?? null;
        if ($parent === null) {
            return;
        }
        if (isset($seen[$parent])) {
            throw new LogicException("Nav parent cycle detected: {$parent} is its own ancestor via {$class}.");
        }
        self::assertNoCycle($parent, $entries, [...$seen, $parent => true]);
    }

    private static function gatePasses(?string $ability): bool
    {
        return $ability === null || Gate::allows($ability);
    }

    /**
     * Builds one page's item plus its visible children (recursively),
     * sorted by order. Omits the 'children' key entirely when there are none.
     *
     * @param  class-string<Page>  $class
     * @param  array<class-string<Page>, array{item: array<string, mixed>, can: string|null}>  $entries
     * @param  array<class-string<Page>, list<class-string<Page>>>  $childrenOf
     * @return array<string, mixed>
     */
    private static function buildNode(string $class, array $entries, array $childrenOf): array
    {
        $node = $entries[$class]['item'];
        $children = [];
        foreach ($childrenOf[$class] ?? [] as $childClass) {
            if (self::gatePasses($entries[$childClass]['can'])) {
                $children[] = self::buildNode($childClass, $entries, $childrenOf);
            }
        }
        if ($children !== []) {
            usort($children, static fn (array $a, array $b) => $a['order'] <=> $b['order']);
            $node['children'] = $children;
        }

        return $node;
    }

    /**
     * Normalize one nav() declaration to a wire item: label/href/order always,
     * icon/badge/badgeColor only when set (sparse). The 'parent' key (if any)
     * is placement metadata consumed by build(), never part of the wire item.
     *
     * @param  array<string, mixed>  $nav
     * @param  class-string<Page>  $class
     * @return array<string, mixed>
     */
    private static function itemFrom(array $nav, string $href, string $class): array
    {
        $item = [
            'label' => (string) ($nav['label'] ?? $class::slug()),
            'href' => $href,
            'order' => (int) ($nav['order'] ?? 0),
        ];

        $icon = self::iconShape($nav['icon'] ?? null);
        if ($icon !== null) {
            $item['icon'] = $icon;
        }

        if (isset($nav['badge'])) {
            $item['badge'] = (string) $nav['badge'];
            $color = $nav['badgeColor'] ?? null;
            if ($color !== null) {
                $item['badgeColor'] = $color instanceof Color ? $color->value : (string) $color;
            }
        }

        return $item;
    }

    /**
     * Normalize a nav icon value to the shared {name, position} wire shape.
     * Accepts a plain icon name or a full ['name', 'position'] array.
     *
     * @return array{name: string, position: string}|null
     */
    private static function iconShape(mixed $icon): ?array
    {
        if ($icon === null) {
            return null;
        }
        if (is_array($icon)) {
            return ['name' => (string) $icon['name'], 'position' => (string) ($icon['position'] ?? 'left')];
        }

        return ['name' => (string) $icon, 'position' => 'left'];
    }

    /**
     * Normalizes a panel-level NavItem to the same {label, href, order, ...}
     * shape as a page-derived item, so both sort and merge identically.
     *
     * @return array<string, mixed>
     */
    private static function customItemFrom(NavItem $item): array
    {
        $wire = $item->toArray();
        $label = $wire['label'];
        $href = $wire['href'];
        unset($wire['label'], $wire['href']);

        return ['label' => $label, 'href' => $href, 'order' => $item->getOrder(), ...$wire];
    }

    /**
     * Sort each group's items by order and merge the matching group meta
     * (icon/collapsible/collapsed) keyed by label. Groups are ordered per
     * navigationGroups()'s declaration; groups it doesn't mention keep their
     * first-seen order and sort after every declared group.
     *
     * @param  array<string, list<array<string, mixed>>>  $groups
     * @param  list<NavGroup>  $navGroups
     * @return list<array<string, mixed>>
     */
    private static function assemble(array $groups, array $navGroups): array
    {
        $meta = [];
        $declaredOrder = [];
        foreach ($navGroups as $index => $navGroup) {
            $meta[$navGroup->label()] = $navGroup->meta();
            $declaredOrder[$navGroup->label()] = $index;
        }

        $names = array_keys($groups);
        usort(
            $names,
            static fn (string $a, string $b) => ($declaredOrder[$a] ?? PHP_INT_MAX) <=> ($declaredOrder[$b] ?? PHP_INT_MAX),
        );

        $out = [];
        foreach ($names as $name) {
            $items = $groups[$name];
            usort($items, static fn (array $a, array $b) => $a['order'] <=> $b['order']);
            $out[] = ['group' => $name, 'items' => $items, ...($meta[$name] ?? [])];
        }

        return $out;
    }
}
