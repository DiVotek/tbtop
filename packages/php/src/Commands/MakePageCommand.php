<?php

namespace Tbtop\Admin\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;

class MakePageCommand extends Command
{
    protected $signature = 'make:tbtop-page
        {name : Page name, e.g. Orders (suffix Page appended if missing)}
        {--path= : Route path override (default: kebab-case of name)}
        {--group=Main : Nav group label}
        {--no-nav : Omit nav() — page will not appear in the sidebar}
        {--force : Overwrite an existing file}';

    protected $description = 'Scaffold a new Tbtop admin page class';

    public function handle(): int
    {
        $name = $this->normalisedName();
        $class = $name.'Page';
        $namespace = $this->resolveNamespace();
        $targetDir = $this->resolveTargetDir($namespace);
        $targetPath = $targetDir.'/'.$class.'.php';

        if (file_exists($targetPath) && ! $this->option('force')) {
            $this->components->error("File already exists: {$targetPath}. Use --force to overwrite.");

            return self::FAILURE;
        }

        if (! is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        file_put_contents($targetPath, $this->buildContents($class, $namespace, $name));

        $this->components->info("Created: {$targetPath}");
        $this->components->warn("Register {$class} in your panel/config pages list.");

        return self::SUCCESS;
    }

    private function normalisedName(): string
    {
        $name = trim((string) $this->argument('name'));

        // Strip a trailing "Page" suffix so we can re-append it consistently.
        if (str_ends_with($name, 'Page')) {
            $name = substr($name, 0, -4);
        }

        return Str::studly($name);
    }

    private function resolveNamespace(): string
    {
        /** @var string $root */
        $root = app()->getNamespace();

        return rtrim($root, '\\').'\\Admin\\Pages';
    }

    private function resolveTargetDir(string $namespace): string
    {
        /** @var string $root */
        $root = app()->getNamespace();
        $appPath = app_path();
        $relative = str_replace(rtrim($root, '\\').'\\', '', $namespace);

        return $appPath.'/'.str_replace('\\', '/', $relative);
    }

    private function buildContents(string $class, string $namespace, string $name): string
    {
        $stub = $this->option('no-nav')
            ? __DIR__.'/../../stubs/tbtop-page-no-nav.stub'
            : __DIR__.'/../../stubs/tbtop-page.stub';

        $contents = (string) file_get_contents($stub);

        $path = $this->option('path') ?: Str::kebab($name);
        $label = Str::headline($name);
        $group = (string) ($this->option('group') ?: 'Main');

        return str_replace(
            ['{{ namespace }}', '{{ class }}', '{{ path }}', '{{ label }}', '{{ group }}'],
            [$namespace, $class, $path, $label, $group],
            $contents
        );
    }
}
