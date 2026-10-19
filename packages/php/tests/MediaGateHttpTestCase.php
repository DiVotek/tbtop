<?php

namespace Tbtop\Admin\Tests;

use Tbtop\Admin\Tests\Fixtures\Panels\GatedMediaPanel;

class MediaGateHttpTestCase extends MediaHttpTestCase
{
    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('tbtop-admin.panels', [GatedMediaPanel::class]);
    }
}
