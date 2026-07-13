<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\CrudActionsPage;

class CrudActionsPanel extends TestPanel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return parent::configure($panel)
            ->locales(['en', 'uk'])
            ->defaultLocale('en');
    }

    protected function pages(): array
    {
        return [CrudActionsPage::class];
    }
}
