<?php

namespace App\Admin;

use App\Admin\Pages\DashboardPage;
use App\Admin\Pages\LoginPage;
use App\Admin\Pages\LoginPreviewPage;
use App\Admin\Pages\MediaEditPage;
use App\Admin\Pages\MediaIndexPage;
use App\Admin\Pages\MediaNewPage;
use App\Admin\Pages\PlaygroundPage;
use App\Admin\Pages\PostCreatePage;
use App\Admin\Pages\PostEditPage;
use App\Admin\Pages\PostsIndexPage;
use App\Admin\Pages\RecordDetailPage;
use App\Admin\Pages\RelationDemoPage;
use App\Admin\Pages\SettingsPage;
use App\Admin\Pages\SoftDeletesDemoPage;
use App\Admin\Pages\TwoFactorChallengePage;
use App\Admin\Pages\TwoFactorSetupPage;
use App\Admin\Pages\UploadDemoPage;
use App\Http\Middleware\RequireFullAuth;
use Tbtop\Admin\Pages\MediaLibraryPage;
use Tbtop\Admin\Panels\Panel;
use Tbtop\Admin\Panels\PanelConfig;

class AdminPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel
            ->id('admin')
            ->prefix('admin')
            ->guard('web')
            ->middleware(['web', RequireFullAuth::class])
            ->pages([
                DashboardPage::class,
                PostsIndexPage::class,
                PostCreatePage::class,
                PostEditPage::class,
                MediaIndexPage::class,
                MediaNewPage::class,
                MediaEditPage::class,
                UploadDemoPage::class,
                SettingsPage::class,
                SoftDeletesDemoPage::class,
                PlaygroundPage::class,
                RecordDetailPage::class,
                MediaLibraryPage::class,
                LoginPreviewPage::class,
                RelationDemoPage::class,
                TwoFactorSetupPage::class,
                LoginPage::class,
                TwoFactorChallengePage::class,
            ])
            ->locales(['en', 'uk'])
            ->defaultLocale('en')
            ->chrome(DemoChrome::class)
            ->rootView('admin');
    }
}
