<?php

namespace Tbtop\Admin\Navigation;

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Panels\CurrentPanel;

final class NavBuilder
{
    /**
     * Builds the sidebar tree from the panel's pages' nav() declarations.
     * Pages with route params, null nav(), or a failing gate are skipped.
     *
     * @return list<array{group: string, items: list<array{label: string, href: string, order: int}>}>
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
            $groups[$group][] = [
                'label' => (string) ($nav['label'] ?? $class::slug()),
                'href' => $prefix.'/'.trim($path, '/'),
                'order' => (int) ($nav['order'] ?? 0),
            ];
        }

        return self::sorted($groups);
    }

    /**
     * @param  array<string, list<array{label: string, href: string, order: int}>>  $groups
     * @return list<array{group: string, items: list<array{label: string, href: string, order: int}>}>
     */
    private static function sorted(array $groups): array
    {
        $out = [];
        foreach ($groups as $name => $items) {
            usort($items, static fn (array $a, array $b) => $a['order'] <=> $b['order']);
            $out[] = ['group' => $name, 'items' => $items];
        }

        return $out;
    }
}
