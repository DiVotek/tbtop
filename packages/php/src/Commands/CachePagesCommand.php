<?php

namespace Tbtop\Admin\Commands;

use Illuminate\Console\Command;
use Tbtop\Admin\Panels\PageDiscovery;
use Tbtop\Admin\Panels\PanelRegistry;

final class CachePagesCommand extends Command
{
    protected $signature = 'tbtop:cache-pages';

    protected $description = 'Rebuild the discovered page index for every configured panel';

    public function handle(PageDiscovery $discovery): int
    {
        $discovery->cache(PanelRegistry::fromConfig()->all());
        $this->components->info('Discovered pages cached. Rebuild route:cache after changing pages.');

        return self::SUCCESS;
    }
}
