<?php

namespace Tbtop\Admin\Commands;

use Illuminate\Support\Str;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Where `admin:install --auth` writes one panel's auth pages. A panel's pages
 * must not land where another panel picks them up, or both would serve them;
 * so the shared `app/Admin/Pages/Auth` goes to the panel that owns it
 * (discovers it, or serves a page from it) or to the first panel that asks,
 * and every other panel gets a directory of its own:
 *
 * 1. `app/Admin/Pages/Auth` — no other panel owns it, and this panel discovers it or
 *    discovers nothing (then it registers the pages itself). Files already there that
 *    no panel registers yet count as another panel's, unless this panel owns the directory.
 * 2. `Auth/` under the panel's first discovery root — the pages are discovered as written.
 * 3. `app/Admin/{PanelId}/Pages/Auth` — the panel discovers nothing and the shared directory is taken.
 *
 * `$conflict` names another panel that still owns the chosen directory
 * (nested discovery roots, or pages it registers from there by hand); the command refuses then.
 *
 * @internal
 */
final readonly class AuthTarget
{
    private function __construct(public string $dir, public string $namespace, public ?string $conflict) {}

    /** @param  array<string, PanelConfig>  $panels  every registered panel, keyed by id */
    public static function for(PanelConfig $panel, array $panels): self
    {
        $others = array_filter($panels, fn (PanelConfig $other): bool => $other->getId() !== $panel->getId());
        $shared = base_path('app/Admin/Pages/Auth');
        $sharedNamespace = self::appNamespace().'\\Admin\\Pages\\Auth';
        $roots = $panel->getPageDiscoveryRoots();

        $owned = self::ownedByAny([$panel], $shared, $sharedNamespace);
        $free = ! self::ownedByAny($others, $shared, $sharedNamespace) && ($owned || (glob($shared.'/*.php') ?: []) === []);
        if ($free && ($roots === [] || self::discovers($panel, $shared))) {
            return self::resolve($shared, $sharedNamespace, $others);
        }
        if ($roots !== []) {
            return self::resolve(rtrim($roots[0]['in'], '/').'/Auth', $roots[0]['for'].'\\Auth', $others);
        }
        $studly = Str::studly($panel->getId());

        return self::resolve(base_path("app/Admin/{$studly}/Pages/Auth"), self::appNamespace()."\\Admin\\{$studly}\\Pages\\Auth", $others);
    }

    /** The path as the command prints it: relative to the host root when inside it. */
    public function relative(string $file = ''): string
    {
        $path = $file === '' ? $this->dir : $this->dir.'/'.$file;
        $root = rtrim(base_path(), '/').'/';

        return str_starts_with($path, $root) ? substr($path, strlen($root)) : $path;
    }

    /** @param  array<string, PanelConfig>  $others */
    private static function resolve(string $dir, string $namespace, array $others): self
    {
        foreach ($others as $id => $other) {
            if (self::ownedByAny([$other], $dir, $namespace)) {
                return new self($dir, $namespace, (string) $id);
            }
        }

        return new self($dir, $namespace, null);
    }

    /** @param  array<array-key, PanelConfig>  $panels */
    private static function ownedByAny(array $panels, string $dir, string $namespace): bool
    {
        foreach ($panels as $panel) {
            if (self::discovers($panel, $dir) || self::servesFrom($panel, $namespace)) {
                return true;
            }
        }

        return false;
    }

    public static function discovers(PanelConfig $panel, string $dir): bool
    {
        foreach ($panel->getPageDiscoveryRoots() as $root) {
            if (str_starts_with(rtrim($dir, '/').'/', rtrim($root['in'], '/').'/')) {
                return true;
            }
        }

        return false;
    }

    /** Pages listed by hand in pages(); discovered ones count through discovers(), without scanning a root that may not exist yet. */
    private static function servesFrom(PanelConfig $panel, string $namespace): bool
    {
        foreach ($panel->getPagesWithDiscovered([]) as $page) {
            if (str_starts_with($page, $namespace.'\\')) {
                return true;
            }
        }

        return false;
    }

    private static function appNamespace(): string
    {
        return rtrim((string) app()->getNamespace(), '\\');
    }
}
