<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Panels\PageDiscovery;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Panels\PanelRegistry;
use Tbtop\Admin\Tests\PageDiscoveryTestCase;

uses(PageDiscoveryTestCase::class);

it('discovers nested concrete pages in class-name order and skips ineligible files', function () {
    $z = $this->writePage('Z');
    $nested = $this->writePage('Nested/A');
    $this->writePage('Base', isAbstract: true);
    $this->writePage('Hidden', isDiscovered: false);
    $this->files->put($this->directory.'/pages/Helper.php', '<?php namespace '.$this->namespace.'; class Helper {}');
    $this->files->put($this->directory.'/pages/Notes.txt', 'not PHP');

    expect($this->panel()->getPages())->toBe([$nested, $z]);
});

it('puts manual pages first, deduplicates discovered classes and honors explicit opt-outs', function () {
    $a = $this->writePage('A');
    $z = $this->writePage('Z');
    $hidden = $this->writePage('Hidden', isDiscovered: false);

    expect($this->panel()->pages([$z, $hidden])->getPages())->toBe([$z, $hidden, $a]);
});

it('replaces only manual pages after the combined list has been resolved', function () {
    $a = $this->writePage('A');
    $first = $this->writePage('First', isDiscovered: false);
    $second = $this->writePage('Second', isDiscovered: false);
    $panel = $this->panel()->pages([$first]);
    expect($panel->getPages())->toBe([$first, $a]);
    expect($panel->pages([$second])->getPages())->toBe([$second, $a]);
});

it('merges manual and discovered pages independently of fluent call order', function (bool $isDiscoveryFirst) {
    $a = $this->writePage('A');
    $z = $this->writePage('Z');
    $panel = new PanelConfig;
    if ($isDiscoveryFirst) {
        $panel->discoverPages($this->directory.'/pages', $this->namespace)->pages([$z]);
    } else {
        $panel->pages([$z])->discoverPages($this->directory.'/pages', $this->namespace);
    }
    expect($panel->getPages())->toBe([$z, $a]);
})->with([true, false]);

it('deduplicates overlapping roots', function () {
    $a = $this->writePage('A');
    $b = $this->writePage('Nested/B');
    expect($this->panel()->discoverPages($this->directory.'/pages/Nested', $this->namespace.'\\Nested')->getPages())
        ->toBe([$a, $b]);
});

it('keeps distinct panel roots isolated in the cached index', function () {
    $a = $this->writePage('A');
    $b = $this->writePage('Nested/B');
    $parent = $this->panel();
    $child = (new PanelConfig)->id('child')->discoverPages($this->directory.'/pages/Nested', $this->namespace.'\\Nested');
    app(PageDiscovery::class)->cache(['parent' => $parent, 'child' => $child]);
    $this->writePage('Nested/C');
    expect($parent->getPages())->toBe([$a, $b]);
    expect($child->getPages())->toBe([$b]);
});

it('rejects duplicate slugs with both class names', function () {
    $a = $this->writePage('A/Index');
    $b = $this->writePage('B/Index');
    expect(fn () => $this->panel()->getPages())->toThrow(InvalidArgumentException::class, "duplicate page slug [index]: [{$a}] and [{$b}]");
});

it('rejects normalized duplicate paths', function () {
    $this->writePage('A');
    $this->writePage('B', path: '/A/');
    expect(fn () => $this->panel()->getPages())->toThrow(InvalidArgumentException::class, 'duplicate page path [A]');
});

it('rejects missing discovery directories', function () {
    expect(fn () => (new PanelConfig)->discoverPages($this->directory.'/missing', $this->namespace)->getPages())
        ->toThrow(InvalidArgumentException::class, 'does not exist');
});

it('rebuilds cached pages from disk and clears the index through Artisan', function () {
    $a = $this->writePage('A');
    expect(Artisan::call('tbtop:cache-pages'))->toBe(0);
    $b = $this->writePage('B');
    expect($this->panel()->getPages())->toBe([$a]);
    expect(Artisan::call('tbtop:cache-pages'))->toBe(0);
    expect($this->panel()->getPages())->toBe([$a, $b]);
    $c = $this->writePage('C');
    expect(Artisan::call('tbtop:clear-cached-pages'))->toBe(0);
    expect($this->panel()->getPages())->toBe([$a, $b, $c]);
});

it('uses a cached empty list without scanning and retains it after a failed rebuild', function () {
    Artisan::call('tbtop:cache-pages');
    $this->files->deleteDirectory($this->directory.'/pages');
    expect($this->panel()->getPages())->toBe([]);
    expect(fn () => Artisan::call('tbtop:cache-pages'))->toThrow(InvalidArgumentException::class);
    expect($this->panel()->getPages())->toBe([]);
});

it('does not freeze manual registrations in the discovered index', function () {
    $a = $this->writePage('A');
    $hidden = $this->writePage('Hidden', isDiscovered: false);
    Artisan::call('tbtop:cache-pages');
    expect($this->panel()->pages([$hidden])->getPages())->toBe([$hidden, $a]);
});

it('repairs a stale index without resolving deleted classes during CLI route bootstrap', function (string $command, array $options) {
    $this->writePage('A');
    Artisan::call('tbtop:cache-pages');
    $path = $this->directory.'/bootstrap/cache/tbtop-pages.php';
    // Simulate a class removed in a new release, without PHP's already-loaded classes masking the failure.
    $this->files->put($path, str_replace('\\\\A', '\\\\Deleted', $this->files->get($path)));
    $this->app->forgetInstance(PanelRegistry::class);
    $argv = $_SERVER['argv'];
    try {
        $_SERVER['argv'] = ['artisan', ...$options, $command];
        require __DIR__.'/../routes/admin.php';
        expect(Artisan::call($command))->toBe(0);
        expect($this->panel()->getPages())->toBe([$this->namespace.'\\A']);
    } finally {
        $_SERVER['argv'] = $argv;
    }
})->with(['tbtop:cache-pages', 'tbtop:clear-cached-pages'])->with([
    'valueless option' => [['--no-interaction']],
    'separate environment value' => [['--env', 'production']],
    'inline environment value' => [['--env=production']],
]);

it('registers routes for other CLI commands even when an option or argument names a cache command', function (array $arguments) {
    $this->writePage('A');
    $this->app->forgetInstance(PanelRegistry::class);
    $argv = $_SERVER['argv'];
    try {
        $_SERVER['argv'] = ['artisan', ...$arguments];
        require __DIR__.'/../routes/admin.php';
        Route::getRoutes()->refreshNameLookups();
        expect(Route::getRoutes()->getByName('tbtop.discovery.a')?->uri())->toBe('discovery/A');
    } finally {
        $_SERVER['argv'] = $argv;
    }
})->with([
    'environment named after cache command' => [['--env', 'tbtop:cache-pages', 'route:list']],
    'command-specific option' => [['route:list', '--path=discovery']],
    'command-specific argument' => [['make:command', 'tbtop:cache-pages']],
]);

it('reuses the cached index after the release directory changes', function () {
    // Atomic-symlink deploy: the same relative root resolves under a new absolute release path.
    $a = $this->writePage('A');
    $this->app->setBasePath($this->directory);
    app(PageDiscovery::class)->cache(['discovery' => $this->panel()]);

    $release = $this->directory.'-r2';
    $this->files->ensureDirectoryExists($release);
    $this->files->copyDirectory($this->directory.'/bootstrap', $release.'/bootstrap');
    $this->app->setBasePath($release);
    $this->app->useBootstrapPath($release.'/bootstrap');

    try {
        $panel = (new PanelConfig)->id('discovery')->discoverPages($release.'/pages', $this->namespace);
        // $release/pages does not exist, so a cache miss would throw instead of returning the index.
        expect($panel->getPages())->toBe([$a]);
    } finally {
        $this->files->deleteDirectory($release);
    }
});

it('rescans when the index references a class deleted since the last rebuild', function () {
    $a = $this->writePage('A');
    Artisan::call('tbtop:cache-pages');
    // Names a class that was never loaded, as a fresh process would see a page deleted in a release.
    $path = $this->directory.'/bootstrap/cache/tbtop-pages.php';
    $this->files->put($path, str_replace('\\\\A', '\\\\Deleted', $this->files->get($path)));

    expect($this->panel()->getPages())->toBe([$a]);
});

it('recovers through the cache commands after a page is deleted', function () {
    $a = $this->writePage('A');
    $this->writePage('Gone');
    Artisan::call('tbtop:cache-pages');
    $this->files->delete($this->directory.'/pages/Gone.php');

    expect(Artisan::call('tbtop:cache-pages'))->toBe(0);
    expect($this->panel()->getPages())->toBe([$a]);
});
