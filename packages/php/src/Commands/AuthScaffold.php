<?php

namespace Tbtop\Admin\Commands;

use Illuminate\Support\Str;
use Tbtop\Admin\Auth\ForgotPasswordPage;
use Tbtop\Admin\Auth\LoginPage;
use Tbtop\Admin\Auth\ResetPasswordPage;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Writes the host's auth pages for `admin:install --auth`: one empty subclass
 * per package base, so fixes arrive through the base while the host owns the
 * file. A page the panel already serves at the same slug or path (a login
 * copied from an older recipe) is left alone — two would break every request
 * of the panel with a duplicate-slug error.
 *
 * @internal
 */
final class AuthScaffold
{
    /** @var array<string, class-string<Page>> */
    private const array PAGES = [
        'LoginPage' => LoginPage::class,
        'ForgotPasswordPage' => ForgotPasswordPage::class,
        'ResetPasswordPage' => ResetPasswordPage::class,
    ];

    /** @var list<string> */
    public array $written = [];

    /** @var list<string> */
    public array $existing = [];

    /** @var list<string> */
    public array $clashes = [];

    public function __construct(public readonly PanelConfig $panel) {}

    public function publish(bool $force): self
    {
        foreach (self::PAGES as $class => $base) {
            $relative = 'app/Admin/Pages/Auth/'.$class.'.php';
            $target = base_path($relative);
            if (file_exists($target) && ! $force) {
                $this->existing[] = $relative;

                continue;
            }
            // Before the clash check: discovery throws on a root that does not exist yet.
            if (! is_dir(dirname($target))) {
                mkdir(dirname($target), 0755, true);
            }
            $clash = $this->servedBy($base, $this->namespace().'\\'.$class);
            if ($clash !== null) {
                $this->clashes[] = "{$clash} already serves /".trim($this->panel->getPrefix(), '/').'/'.$base::path();

                continue;
            }
            file_put_contents($target, $this->contents($class));
            $this->written[] = $relative;
        }

        return $this;
    }

    /** Whether one of the panel's discovery roots picks the published pages up. */
    public function isDiscovered(): bool
    {
        $dir = base_path('app/Admin/Pages/Auth').'/';
        foreach ($this->panel->getPageDiscoveryRoots() as $root) {
            if (str_starts_with($dir, rtrim($root['in'], '/').'/')) {
                return true;
            }
        }

        return false;
    }

    public function namespace(): string
    {
        return rtrim((string) app()->getNamespace(), '\\').'\\Admin\\Pages\\Auth';
    }

    /** @param class-string<Page> $base */
    private function servedBy(string $base, string $generated): ?string
    {
        foreach ($this->panel->getPages() as $page) {
            if ($page === $generated) {
                continue;
            }
            if ($page::slug() === Str::kebab(class_basename($generated)) || trim($page::path(), '/') === trim($base::path(), '/')) {
                return $page;
            }
        }

        return null;
    }

    private function contents(string $class): string
    {
        $stub = (string) file_get_contents(__DIR__.'/../../stubs/install/auth/'.$class.'.php.stub');

        return str_replace('{{ namespace }}', $this->namespace(), $stub);
    }
}
