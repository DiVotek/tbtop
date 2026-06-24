<?php

namespace Tbtop\Admin\Navigation;

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\CurrentPanel;

final class NavBuilder
{
    /**
     * Builds the sidebar tree from the panel's pages' nav() declarations.
     * Pages with route params, null nav(), or a failing gate are skipped.
     * Per-item icon/badge come from nav(); per-group icon/collapsible come
     * from the panel's navigationGroups(), matched by group label.
     *
     * @return list<array<string, mixed>>
     */
    public static function build(CurrentPanel $panel): array
    {
        $prefix = $panel->pathPrefix();

        $groups = [];
        foreach ($panel->pages() as $class) {
            $nav = $class::nav();
            $path = $class::path();
            if ($nav === null || str_contains($path, '{')) {
                continue;
            }
            $gate = $class::can();
            if ($gate !== null && ! Gate::allows($gate)) {
                continue;
            }
            $group = (string) ($nav['group'] ?? 'General');
            $groups[$group][] = self::itemFrom($nav, $prefix.'/'.trim($path, '/'), $class);
        }

        return self::assemble($groups, $panel->navigationGroups());
    }

    /**
     * Normalize one nav() declaration to a wire item: label/href/order always,
     * icon/badge/badgeColor only when set (sparse).
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
     * Sort each group's items by order and merge the matching group meta
     * (icon/collapsible/collapsed) keyed by label.
     *
     * @param  array<string, list<array<string, mixed>>>  $groups
     * @param  list<NavGroup>  $navGroups
     * @return list<array<string, mixed>>
     */
    private static function assemble(array $groups, array $navGroups): array
    {
        $meta = [];
        foreach ($navGroups as $navGroup) {
            $meta[$navGroup->label()] = $navGroup->meta();
        }

        $out = [];
        foreach ($groups as $name => $items) {
            usort($items, static fn (array $a, array $b) => $a['order'] <=> $b['order']);
            $out[] = ['group' => $name, 'items' => $items, ...($meta[$name] ?? [])];
        }

        return $out;
    }
}
