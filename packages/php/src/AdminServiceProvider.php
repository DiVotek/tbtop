<?php

namespace Tbtop\Admin;

use Inertia\Inertia;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Tbtop\Admin\Navigation\NavBuilder;

class AdminServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('tbtop-admin')
            ->hasConfigFile()
            ->hasRoute('admin');
    }

    public function packageBooted(): void
    {
        Inertia::share('tbtop', static fn () => [
            'effects' => session('tbtop.effects', []),
            'nav' => NavBuilder::build(),
            'prefix' => '/'.trim((string) config('tbtop-admin.prefix'), '/'),
        ]);
    }
}
