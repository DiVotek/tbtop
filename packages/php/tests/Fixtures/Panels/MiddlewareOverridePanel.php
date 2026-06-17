<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\PublicLoginPage;
use Tbtop\Admin\Tests\Fixtures\StricterPage;

/**
 * Panel mixing an inheriting page (NavPage), a public override (PublicLoginPage),
 * and a stricter override (StricterPage). Drives MiddlewareOverrideHttpTest.
 */
class MiddlewareOverridePanel extends TestPanel
{
    protected function pages(): array
    {
        return [
            NavPage::class,
            PublicLoginPage::class,
            StricterPage::class,
        ];
    }
}
