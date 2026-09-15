<?php

namespace App\Admin;

use App\Admin\Pages\DashboardPage;
use App\Http\Middleware\RequireFullAuth;
use Tbtop\Admin\CommandPalette\Command;
use Tbtop\Admin\CommandPalette\CommandPaletteConfig;
use Tbtop\Admin\Navigation\NavGroup;
use Tbtop\Admin\Navigation\NavItem;
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
            // DashboardPage stays first: no page owns '/', so the panel root redirects to the
            // first static path. MediaLibraryPage is package-owned and outside the discovery root.
            ->pages([
                DashboardPage::class,
                MediaLibraryPage::class,
            ])
            ->discoverPages(
                in: app_path('Admin/Pages'),
                for: 'App\\Admin\\Pages',
            )
            ->navigationGroups([
                NavGroup::make('Overview')->icon('home'),
                NavGroup::make('Content')->icon('file-text')->collapsible(),
                NavGroup::make('System')->icon('settings')->collapsible()->collapsed(),
            ])
            ->navigation('topbar')
            ->navigationItems([
                NavItem::make('Documentation')->url('https://github.com/DiVotek/tbtop')
                    ->icon('globe')->group('Resources')->newTab(),
            ])
            ->userMenuItems([
                NavItem::make('API Tokens')->url('/admin/api-tokens')->icon('key'),
            ])
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
