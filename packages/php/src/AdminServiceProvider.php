<?php

namespace Tbtop\Admin;

use Inertia\Inertia;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Tbtop\Admin\I18n\LocaleService;
use Tbtop\Admin\Navigation\NavBuilder;

class AdminServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('tbtop-admin')
            ->hasConfigFile()
            ->hasRoute('admin')
            ->hasTranslations();
    }

    public function packageBooted(): void
    {
        Inertia::share('tbtop', static function (): array {
            $locale = LocaleService::currentLocale();

            return [
                'effects' => session('tbtop.effects', []),
                'nav' => NavBuilder::build(),
                'prefix' => '/'.trim((string) config('tbtop-admin.prefix'), '/'),
                'locale' => $locale,
                'locales' => LocaleService::availableLocales(),
                'messages' => LocaleService::messagesFor($locale),
                'contentLocales' => LocaleService::contentLocales(),
                'defaultContentLocale' => LocaleService::defaultContentLocale(),
            ];
        });
    }
}
