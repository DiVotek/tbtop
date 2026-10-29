<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\Auth\TwoFactorChallengePage;

/** AuthPanel after admin:install --2fa: the same pages plus the challenge. */
class TwoFactorPanel extends AuthPanel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        $config = parent::configure($panel);

        return $config->pages([...$config->getPages(), TwoFactorChallengePage::class]);
    }
}
