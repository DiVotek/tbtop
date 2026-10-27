<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Panels\Panel;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\Auth\ForgotPasswordPage;
use Tbtop\Admin\Tests\Fixtures\Auth\LoginPage;
use Tbtop\Admin\Tests\Fixtures\Auth\ProfilePage;
use Tbtop\Admin\Tests\Fixtures\Auth\ResetPasswordPage;
use Tbtop\Admin\Tests\Fixtures\NavPage;

/** Panel on the non-default 'staff' guard; the auth pages come first, as FQCN-ordered discovery would put them. */
class AuthPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel
            ->id('admin')
            ->prefix('admin')
            ->guard('staff')
            ->middleware(['web'])
            ->passwordBroker('staff')
            ->pages([ForgotPasswordPage::class, LoginPage::class, ProfilePage::class, ResetPasswordPage::class, NavPage::class]);
    }
}
