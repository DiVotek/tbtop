<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\McpPage;
use Tbtop\Admin\Tests\Fixtures\McpRecordPage;
use Tbtop\Admin\Tests\Fixtures\McpRecordSecretPage;

class McpPanel extends TestPanel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return parent::configure($panel)->mcp(['auth:web']);
    }

    protected function pages(): array
    {
        return [McpPage::class, McpRecordPage::class, McpRecordSecretPage::class];
    }
}
