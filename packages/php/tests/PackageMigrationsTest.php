<?php

use Illuminate\Support\Facades\Schema;
use Spatie\LaravelPackageTools\Package;
use Tbtop\Admin\AdminServiceProvider;

it('package migrations run without vendor:publish', function () {
    expect(Schema::hasTable('tbtop_media'))->toBeTrue()
        ->and(Schema::hasTable('tbtop_media_folders'))->toBeTrue();
});

it('creates the metadata columns added by the third migration', function () {
    expect(Schema::hasColumn('tbtop_media', 'description'))->toBeTrue()
        ->and(Schema::hasColumn('tbtop_media', 'tags'))->toBeTrue();
});

it('registers every migration file in database/migrations via hasMigrations()', function () {
    $package = new Package;
    $package->setBasePath(__DIR__.'/..');
    (new AdminServiceProvider($this->app))->configurePackage($package);

    $migrationsPath = __DIR__.'/../database/migrations';
    $filesOnDisk = collect(glob($migrationsPath.'/*.php'))
        ->map(fn (string $path) => basename($path, '.php'))
        ->sort()
        ->values();

    $registered = collect($package->migrationFileNames)->sort()->values();

    expect($registered->all())->toBe($filesOnDisk->all());
});
