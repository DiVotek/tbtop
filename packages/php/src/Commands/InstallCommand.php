<?php

namespace Tbtop\Admin\Commands;

use Illuminate\Console\Command;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Panels\PanelRegistry;

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
    protected $signature = 'admin:install
        {--force : Overwrite files that already exist}
        {--auth : Also publish sign-in and password reset pages for one panel}
        {--panel= : The panel --auth targets, required when several are registered}';

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
        $panel = null;
        if ($this->option('auth')) {
            $panel = $this->authPanel();
            if ($panel === null) {
                return self::FAILURE;
            }
        }

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

        $auth = $panel === null ? null : (new AuthScaffold($panel))->publish((bool) $this->option('force'));
        if ($auth !== null) {
            $this->reportAuth($auth);
        }

        $this->manualSteps();
        if ($auth !== null) {
            $this->authSteps($auth);
        }

        return self::SUCCESS;
    }

    /** The panel --auth targets; null after printing why there is none. */
    private function authPanel(): ?PanelConfig
    {
        $panels = PanelRegistry::fromConfig()->all();
        $id = $this->option('panel');
        if (is_string($id) && $id !== '') {
            if (! isset($panels[$id])) {
                $this->components->error("Unknown panel [{$id}]. Registered: ".implode(', ', array_keys($panels)).'.');

                return null;
            }

            return $panels[$id];
        }
        if ($panels === []) {
            $this->components->error('No panel registered: add one to tbtop-admin.panels before --auth.');

            return null;
        }
        if (count($panels) > 1) {
            $this->components->error('Several panels: pass --panel=<id>');

            return null;
        }

        return array_values($panels)[0];
    }

    private function reportAuth(AuthScaffold $auth): void
    {
        foreach ($auth->written as $relative) {
            $this->components->info("Published: {$relative}");
        }
        foreach ($auth->existing as $relative) {
            $this->components->warn("Exists, left untouched: {$relative} (use --force to overwrite)");
        }
        foreach ($auth->clashes as $clash) {
            $this->components->warn("Skipped: {$clash} — delete it to use the scaffold");
        }
    }

    private function authSteps(AuthScaffold $auth): void
    {
        $panel = $auth->panel;
        $login = '/'.trim($panel->getPrefix(), '/').'/login';
        $this->newLine();
        $this->line('  5. Send guests to the panel login (bootstrap/app.php, inside withMiddleware) — without it a guest gets a 500:');
        $this->line("       \$middleware->redirectGuestsTo(fn () => \\Tbtop\\Admin\\Auth\\LoginPage::url() ?? '{$login}');");
        $this->line('     LoginPage::url() is the login of the panel the request belongs to; the fallback serves routes outside panels.');

        if (! $auth->isDiscovered()) {
            $this->newLine();
            $this->line("  6. Panel [{$panel->getId()}] does not discover app/Admin/Pages; register the auth pages:");
            $this->line('       ->discoverPages(in: app_path(\'Admin/Pages\'), for: \''.str_replace('\\Auth', '', $auth->namespace()).'\')');
        }
    }

    private function stub(string $name): string
    {
        return (string) file_get_contents(__DIR__.'/../../stubs/install/'.$name);
    }

    private function manualSteps(): void
    {
        $this->newLine();
        $this->components->warn('Steps that remain, in files this package does not own:');
        $this->newLine();

        $this->line('  1. Add the admin entry to the Vite input list (vite.config.ts):');
        $this->line("       input: ['resources/css/app.css', 'resources/js/app.tsx', 'resources/js/admin.tsx'],");
        $this->newLine();

        $this->line('  2. Point the panel at the published root view:');
        $this->line("       ->rootView('admin')");
        $this->newLine();

        $this->line('  3. Make sure the host compiles Tailwind v4 (the client ships a Tailwind source, not built CSS):');
        $this->line('       npm install -D tailwindcss @tailwindcss/vite   # and add tailwindcss() to the Vite plugins');
        $this->newLine();

        $this->line('  4. Install the client package and rebuild:');
        $this->line('       npm install @tbtop/inertia-admin && npm run build');
    }
}
