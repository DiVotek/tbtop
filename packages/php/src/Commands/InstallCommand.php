<?php

namespace Tbtop\Admin\Commands;

use Illuminate\Console\Command;

/**
 * Publishes the host-side wiring the admin panel needs to render.
 *
 * The panel renders through the host's own Inertia setup, on a dedicated entry
 * rather than the host's main one: the panel bundle is large (the richtext
 * chunk alone is ~270KB) and a public frontend should not pay for it. That
 * isolation is the whole reason three files are published instead of one
 * delegate component — an entry, the root view that loads it, and the
 * stylesheet the entry imports.
 *
 * Only new files are written. Two pieces of wiring live in files this package
 * does not own — the Vite input list and the panel's rootView — so they are
 * reported as manual steps instead of being patched in. Rewriting a host's
 * build config from a package is how installers silently break projects.
 */
class InstallCommand extends Command
{
    protected $signature = 'admin:install {--force : Overwrite files that already exist}';

    protected $description = 'Publish the host wiring for the admin panel: root view, JS entry, and stylesheet.';

    /**
     * Stub basename => path relative to the host application root.
     *
     * @var array<string, string>
     */
    private const array FILES = [
        'admin.blade.php.stub' => 'resources/views/admin.blade.php',
        'admin.tsx.stub' => 'resources/js/admin.tsx',
        'admin.css.stub' => 'resources/css/admin.css',
    ];

    public function handle(): int
    {
        $written = [];
        $skipped = [];

        foreach (self::FILES as $stub => $relative) {
            $target = base_path($relative);

            if (file_exists($target) && ! $this->option('force')) {
                $skipped[] = $relative;

                continue;
            }

            $directory = dirname($target);
            if (! is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            file_put_contents($target, $this->stub($stub));
            $written[] = $relative;
        }

        foreach ($written as $relative) {
            $this->components->info("Published: {$relative}");
        }

        foreach ($skipped as $relative) {
            $this->components->warn("Exists, left untouched: {$relative} (use --force to overwrite)");
        }

        $this->manualSteps();

        return self::SUCCESS;
    }

    private function stub(string $name): string
    {
        return (string) file_get_contents(__DIR__.'/../../stubs/install/'.$name);
    }

    private function manualSteps(): void
    {
        $this->newLine();
        $this->components->warn('Three steps remain, in files this package does not own:');
        $this->newLine();

        $this->line('  1. Add the admin entry to the Vite input list (vite.config.ts):');
        $this->line("       input: ['resources/css/app.css', 'resources/js/app.tsx', 'resources/js/admin.tsx'],");
        $this->newLine();

        $this->line('  2. Point the panel at the published root view:');
        $this->line("       ->rootView('admin')");
        $this->newLine();

        $this->line('  3. Install the client package and rebuild:');
        $this->line('       npm install @tbtop/inertia-admin && npm run build');
    }
}
