<?php

namespace Tbtop\Admin\Tests;

use Closure;
use Illuminate\Filesystem\Filesystem;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\Panels\DiscoveryPanel;

class PageDiscoveryTestCase extends TestCase
{
    protected string $directory;

    protected string $namespace;

    protected Filesystem $files;

    private Closure $autoload;

    protected function setUp(): void
    {
        parent::setUp();
        $this->directory = sys_get_temp_dir().'/tbtop-discovery-'.bin2hex(random_bytes(6));
        $this->namespace = 'Discovery'.bin2hex(random_bytes(6));
        $this->files = new Filesystem;
        $this->files->ensureDirectoryExists($this->directory.'/pages');
        $this->app->useBootstrapPath($this->directory.'/bootstrap');
        $this->autoload = function (string $class): void {
            if (! str_starts_with($class, $this->namespace.'\\')) {
                return;
            }
            $relative = str_replace('\\', '/', substr($class, strlen($this->namespace) + 1));
            $path = $this->directory.'/pages/'.$relative.'.php';
            if (is_file($path)) {
                require $path;
            }
        };
        spl_autoload_register($this->autoload);
        config([
            'discovery.path' => $this->directory.'/pages',
            'discovery.namespace' => $this->namespace,
            'tbtop-admin.panels' => [DiscoveryPanel::class],
            'app.key' => 'base64:'.base64_encode(random_bytes(32)),
        ]);
    }

    protected function tearDown(): void
    {
        spl_autoload_unregister($this->autoload);
        $this->files->deleteDirectory($this->directory);
        parent::tearDown();
    }

    protected function panel(): PanelConfig
    {
        return (new PanelConfig)->id('discovery')
            ->discoverPages($this->directory.'/pages', $this->namespace);
    }

    /** Real autoloadable files let tests exercise recursive discovery and cache changes without mocking the filesystem. */
    protected function writePage(
        string $name,
        ?string $path = null,
        bool $isAbstract = false,
        bool $isDiscovered = true,
        bool $isPublic = false,
    ): string {
        $parts = explode('/', $name);
        $base = array_pop($parts);
        $namespace = $this->namespace.($parts ? '\\'.implode('\\', $parts) : '');
        $file = $this->directory.'/pages/'.$name.'.php';
        $this->files->ensureDirectoryExists(dirname($file));
        $modifier = $isAbstract ? 'abstract' : 'final';
        $route = var_export($path ?? $name, true);
        $discoveryOverride = $isDiscovered ? '' : 'public static function isDiscovered(): bool { return false; }';
        $middleware = $isPublic ? "['web']" : 'null';
        $this->files->put($file, <<<PHP
            <?php
            namespace {$namespace};
            {$modifier} class {$base} extends \Tbtop\Admin\Pages\Page
            {
                public static function path(): string { return {$route}; }
                {$discoveryOverride}
                public static function middleware(\Tbtop\Admin\Panels\PanelConfig \$panel): ?array { return {$middleware}; }
                public function view(\Tbtop\Admin\Dsl\S \$s): \Tbtop\Admin\Dsl\Node
                {
                    return \$s->stack([\$s->displayText('discovered')]);
                }
            }
            PHP);

        return $namespace.'\\'.$base;
    }
}
