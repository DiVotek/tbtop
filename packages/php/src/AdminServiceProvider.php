<?php

namespace Tbtop\Admin;

use Inertia\Inertia;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Tbtop\Admin\Commands\MakePageCommand;
use Tbtop\Admin\I18n\LocaleService;
use Tbtop\Admin\Navigation\NavBuilder;
use Tbtop\Admin\Panels\ChromeSerializer;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelRegistry;

class AdminServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('tbtop-admin')
            ->hasConfigFile()
            ->hasMigrations([
                '2026_01_01_000001_create_tbtop_media_folders_table',
                '2026_01_01_000002_create_tbtop_media_table',
                '2026_01_01_000003_add_metadata_to_tbtop_media_table',
            ])
            ->runsMigrations()
            ->hasRoute('admin')
            ->hasTranslations()
            ->hasCommand(MakePageCommand::class);
    }

    public function packageRegistered(): void
    {
        $this->app->singleton(PanelRegistry::class, static fn (): PanelRegistry => PanelRegistry::fromConfig());
    }

    public function packageBooted(): void
    {
        Inertia::share('tbtop', static function (): ?array {
            $panel = CurrentPanel::current();
            if ($panel === null) {
                return null;
            }

            $locale = LocaleService::currentLocale();
            $prefix = $panel->pathPrefix();
            $pollSeconds = $panel->notificationsPolling();
            $palette = $panel->commandPalette();

            return [
                'panel' => $panel->id(),
                'nav' => NavBuilder::build($panel),
                'userMenuItems' => $panel->userMenuItems(),
                'chrome' => ChromeSerializer::forPanel($panel),
                'brand' => $panel->brand(),
                'navigation' => $panel->navigation(),
                'appearance' => $panel->appearance() ?: null,
                'prefix' => $prefix,
                'apiBase' => $prefix.'/api',
                'locale' => $locale,
                'locales' => LocaleService::availableLocales(),
                'messages' => LocaleService::messagesFor($locale),
                'contentLocales' => LocaleService::contentLocales(),
                'defaultContentLocale' => LocaleService::defaultContentLocale(),
                'notifications' => [
                    'pollInterval' => $pollSeconds !== null ? $pollSeconds * 1000 : null,
                ],
                'palette' => $palette === null ? null : (object) $palette,
            ];
        });
    }
}
