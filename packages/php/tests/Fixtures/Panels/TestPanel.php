<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\Panel;
use Tbtop\Admin\Panels\PanelConfig;

/** Shared baseline for fixture panels: id 'admin', no auth beyond the web guard. */
abstract class TestPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel
            ->id('admin')
            ->prefix('admin')
            ->guard('web')
            ->middleware(['web'])
            ->pages($this->pages());
    }

    /** @return list<class-string<Page>> */
    abstract protected function pages(): array;
}
