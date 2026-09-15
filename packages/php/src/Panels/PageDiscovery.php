<?php

namespace Tbtop\Admin\Panels;

use Illuminate\Filesystem\Filesystem;
use InvalidArgumentException;
use ReflectionClass;
use RuntimeException;
use Tbtop\Admin\Pages\Page;

/** Filesystem discovery and the deployment-time index; never caches authorization or page output. */
final class PageDiscovery
{
    public function __construct(private readonly Filesystem $files) {}

    /** @param list<array{in: string, for: string}> $roots @return list<class-string<Page>> */
    public function getPages(array $roots): array
    {
        $path = $this->getCachePath();
        if ($this->files->exists($path)) {
            $index = $this->files->getRequire($path);
            $key = $this->key($roots);
            if (isset($index[$key])) {
                return $index[$key];
            }
        }

        return $this->scan($roots);
    }

    /** @param array<string, PanelConfig> $panels */
    public function cache(array $panels): void
    {
        $index = [];
        foreach ($panels as $panel) {
            $roots = $panel->getPageDiscoveryRoots();
            if ($roots === []) {
                continue;
            }
            $pages = $this->scan($roots);
            $panel->getPagesWithDiscovered($pages);
            $index[$this->key($roots)] = $pages;
        }

        // Publish only after every panel validates; a failed rebuild keeps the previous index intact.
        $path = $this->getCachePath();
        $this->files->ensureDirectoryExists(dirname($path));
        $this->files->replace($path, '<?php return '.var_export($index, true).';'.PHP_EOL);
        $this->invalidateOpcodeCache($path);
    }

    public function clear(): void
    {
        $path = $this->getCachePath();
        if ($this->files->exists($path) && ! $this->files->delete($path)) {
            throw new RuntimeException("Unable to clear page discovery cache [{$path}].");
        }
        $this->invalidateOpcodeCache($path);
    }

    public function getCachePath(): string
    {
        return app()->bootstrapPath('cache/tbtop-pages.php');
    }

    /** @param list<array{in: string, for: string}> $roots @return list<class-string<Page>> */
    private function scan(array $roots): array
    {
        $pages = [];
        foreach ($roots as $root) {
            array_push($pages, ...$this->scanRoot($root));
        }

        $pages = array_values(array_unique($pages));
        sort($pages, SORT_STRING);

        return $pages;
    }

    /** @param array{in: string, for: string} $root @return list<class-string<Page>> */
    private function scanRoot(array $root): array
    {
        if (! $this->files->isDirectory($root['in'])) {
            throw new InvalidArgumentException("Page discovery directory [{$root['in']}] does not exist.");
        }
        $pages = [];
        foreach ($this->files->allFiles($root['in']) as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }
            $relative = substr($file->getRelativePathname(), 0, -4);
            $class = $root['for'].'\\'.str_replace(DIRECTORY_SEPARATOR, '\\', $relative);
            if (! is_subclass_of($class, Page::class)) {
                continue;
            }
            if ((new ReflectionClass($class))->isAbstract() || ! $class::isDiscovered()) {
                continue;
            }
            $pages[] = $class;
        }

        return $pages;
    }

    /** Keyed relative to the app root: symlink deploys change it per release and would miss the index. @param list<array{in: string, for: string}> $roots */
    private function key(array $roots): string
    {
        $relative = array_map(
            fn (array $root): array => ['in' => $this->relativeRoot($root['in']), 'for' => $root['for']],
            $roots,
        );

        return hash('sha256', serialize($relative));
    }

    /** Roots outside the application root keep their absolute path — they do not move between releases. */
    private function relativeRoot(string $in): string
    {
        $base = rtrim(str_replace('\\', '/', app()->basePath()), '/').'/';
        $path = str_replace('\\', '/', $in);

        return str_starts_with($path, $base) ? substr($path, strlen($base)) : $path;
    }

    private function invalidateOpcodeCache(string $path): void
    {
        if (function_exists('opcache_invalidate')) {
            opcache_invalidate($path, true);
        }
    }
}
