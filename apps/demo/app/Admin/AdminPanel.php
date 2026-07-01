<?php

namespace App\Admin;

use App\Admin\Pages\BrandsIndexPage;
use App\Admin\Pages\DashboardPage;
use App\Admin\Pages\DependentFieldsDemoPage;
use App\Admin\Pages\LoginPage;
use App\Admin\Pages\LoginPreviewPage;
use App\Admin\Pages\MediaEditPage;
use App\Admin\Pages\MediaIndexPage;
use App\Admin\Pages\MediaNewPage;
use App\Admin\Pages\NewFeaturesPage;
use App\Admin\Pages\PlaygroundPage;
use App\Admin\Pages\PostCreatePage;
use App\Admin\Pages\PostDocumentsPage;
use App\Admin\Pages\PostEditPage;
use App\Admin\Pages\PostsIndexPage;
use App\Admin\Pages\RecordDetailPage;
use App\Admin\Pages\RelationDemoPage;
use App\Admin\Pages\ReorderablePostsPage;
use App\Admin\Pages\SettingsPage;
use App\Admin\Pages\SoftDeletesDemoPage;
use App\Admin\Pages\TwoFactorChallengePage;
use App\Admin\Pages\TwoFactorSetupPage;
use App\Admin\Pages\UploadDemoPage;
use App\Admin\Pages\ValidationRulesPage;
use App\Http\Middleware\RequireFullAuth;
use Tbtop\Admin\CommandPalette\Command;
use Tbtop\Admin\CommandPalette\CommandPaletteConfig;
use Tbtop\Admin\Navigation\NavGroup;
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
                BrandsIndexPage::class,
                ReorderablePostsPage::class,
                PostCreatePage::class,
                PostEditPage::class,
                PostDocumentsPage::class,
                MediaIndexPage::class,
                MediaNewPage::class,
                MediaEditPage::class,
                UploadDemoPage::class,
                SettingsPage::class,
                SoftDeletesDemoPage::class,
                PlaygroundPage::class,
                NewFeaturesPage::class,
                ValidationRulesPage::class,
                RecordDetailPage::class,
                MediaLibraryPage::class,
                LoginPreviewPage::class,
                RelationDemoPage::class,
                DependentFieldsDemoPage::class,
                TwoFactorSetupPage::class,
                LoginPage::class,
                TwoFactorChallengePage::class,
            ])
            ->navigationGroups([
                NavGroup::make('Overview')->icon('home'),
                NavGroup::make('Content')->icon('file-text')->collapsible(),
                NavGroup::make('System')->icon('settings')->collapsible()->collapsed(),
            ])
            ->navigation('topbar')
            ->commandPalette(fn (CommandPaletteConfig $p) => $p->commands([
                Command::make('Create post')->icon('file-text')->url('/admin/posts/new')->group('Actions'),
                Command::make('tbtop on GitHub')->icon('globe')->url('https://github.com/DiVotek/tbtop')->openInNewTab()->group('Links'),
            ]))
            ->maxContentWidth('7xl')
            ->locales(['en', 'uk'])
            ->defaultLocale('en')
            ->chrome(DemoChrome::class)
            ->rootView('admin');
    }
}
