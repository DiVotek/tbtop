<?php

namespace Tbtop\Admin\Commands;

use Illuminate\Console\Command;
use Tbtop\Admin\Panels\PageDiscovery;

final class ClearCachedPagesCommand extends Command
{
    protected $signature = 'tbtop:clear-cached-pages';

    protected $description = 'Remove the discovered page index';

    public function handle(PageDiscovery $discovery): int
    {
        $discovery->clear();
        $this->components->info('Discovered page cache cleared. Clear route:cache to discover new routes.');

        return self::SUCCESS;
    }
}
