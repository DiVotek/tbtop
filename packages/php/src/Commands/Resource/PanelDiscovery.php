<?php

namespace Tbtop\Admin\Commands\Resource;

use Tbtop\Admin\Panels\PanelRegistry;
use Throwable;

/**
 * Which configured panel, if any, discovers pages written into a directory.
 *
 * @internal
 */
final class PanelDiscovery
{
    public static function panelFor(string $dir): ?string
    {
        try {
            $panels = PanelRegistry::fromConfig()->all();
        } catch (Throwable) {
            return null;
        }
        foreach ($panels as $id => $panel) {
            foreach ($panel->getPageDiscoveryRoots() as $root) {
                if (str_starts_with($dir.'/', rtrim($root['in'], '/').'/')) {
                    return (string) $id;
                }
            }
        }

        return null;
    }
}
