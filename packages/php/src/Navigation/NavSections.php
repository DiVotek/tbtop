<?php

namespace Tbtop\Admin\Navigation;

/**
 * Orders one group's items into section runs. PHP owns the order so the
 * client only has to group adjacent items by their `section` key.
 */
final class NavSections
{
    /**
     * Unsectioned → declared → undeclared (first-seen); empty sections get no heading.
     *
     * @param  list<array<string, mixed>>  $items
     * @param  array<string, string>  $declared
     * @return array{items: list<array<string, mixed>>, sections: list<array{key: string, label: string}>}
     */
    public static function arrange(array $items, array $declared): array
    {
        $unsectioned = [];
        $buckets = array_fill_keys(array_keys($declared), []);
        foreach ($items as $item) {
            if (! isset($item['section'])) {
                $unsectioned[] = $item;

                continue;
            }
            $buckets[$item['section']][] = $item;
        }

        $ordered = $unsectioned;
        $sections = [];
        foreach ($buckets as $key => $bucket) {
            if ($bucket === []) {
                continue;
            }
            $key = (string) $key;
            $sections[] = ['key' => $key, 'label' => $declared[$key] ?? $key];
            array_push($ordered, ...$bucket);
        }

        return ['items' => $ordered, 'sections' => $sections];
    }
}
