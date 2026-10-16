<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Panels\PanelConfig;

/** MediaPanel whose media-manager API requires the `manage-media` ability. */
class GatedMediaPanel extends MediaPanel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return parent::configure($panel)->mediaGate('manage-media');
    }
}
