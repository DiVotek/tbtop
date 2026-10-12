<?php

use Illuminate\Support\Facades\File;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\Panel;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * The command writes into base_path(), so every test runs against a throwaway
 * host skeleton rather than the Testbench one — otherwise a run would leave
 * files behind in the shared fixture app.
 */
beforeEach(function () {
    $this->hostRoot = sys_get_temp_dir().'/tbtop-admin-install-'.uniqid();
    File::makeDirectory($this->hostRoot, 0755, true);
    app()->setBasePath($this->hostRoot);
});

afterEach(function () {
    File::deleteDirectory($this->hostRoot);
});

it('publishes the host wiring into a bare application', function () {
    $this->artisan('admin:install')->assertSuccessful();

    expect($this->hostRoot.'/resources/views/admin.blade.php')->toBeFile()
        ->and($this->hostRoot.'/resources/js/admin.tsx')->toBeFile()
        ->and($this->hostRoot.'/resources/css/admin.css')->toBeFile();
});

it('publishes an entry that resolves the panel component', function () {
    $this->artisan('admin:install')->assertSuccessful();

    $entry = File::get($this->hostRoot.'/resources/js/admin.tsx');

    expect($entry)->toContain('admin/page')
        ->and($entry)->toContain('@tbtop/inertia-admin')
        ->and($entry)->toContain('AdminPage');
});

it('publishes a root view that loads the admin entry', function () {
    $this->artisan('admin:install')->assertSuccessful();

    expect(File::get($this->hostRoot.'/resources/views/admin.blade.php'))
        ->toContain('resources/js/admin.tsx')
        ->toContain('<x-inertia::app />');
});

it('leaves an existing file untouched without --force', function () {
    File::makeDirectory($this->hostRoot.'/resources/js', 0755, true);
    File::put($this->hostRoot.'/resources/js/admin.tsx', '// host edits');

    $this->artisan('admin:install')->assertSuccessful();

    expect(File::get($this->hostRoot.'/resources/js/admin.tsx'))->toBe('// host edits');
});

it('overwrites an existing file with --force', function () {
    File::makeDirectory($this->hostRoot.'/resources/js', 0755, true);
    File::put($this->hostRoot.'/resources/js/admin.tsx', '// host edits');

    $this->artisan('admin:install', ['--force' => true])->assertSuccessful();

    expect(File::get($this->hostRoot.'/resources/js/admin.tsx'))->not->toBe('// host edits')
        ->and(File::get($this->hostRoot.'/resources/js/admin.tsx'))->toContain('createInertiaApp');
});

it('is a no-op on a second run, leaving the published files as they are', function () {
    $this->artisan('admin:install')->assertSuccessful();
    $first = File::get($this->hostRoot.'/resources/js/admin.tsx');

    $this->artisan('admin:install')->assertSuccessful();

    expect(File::get($this->hostRoot.'/resources/js/admin.tsx'))->toBe($first);
});

it('reports the wiring it cannot write itself', function () {
    $this->artisan('admin:install')
        ->expectsOutputToContain('vite.config.ts')
        ->expectsOutputToContain('rootView')
        ->assertSuccessful();
});

/** A host app: --auth derives the page namespace from its composer.json. */
function authHost(string $root, array $panels): void
{
    File::put($root.'/composer.json', json_encode(['autoload' => ['psr-4' => ['App\\' => 'app/']]]));
    config(['tbtop-admin.panels' => $panels]);
}

it('publishes no auth pages without --auth', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class]);

    $this->artisan('admin:install')->assertSuccessful();

    expect($this->hostRoot.'/app/Admin/Pages/Auth')->not->toBeDirectory();
});

it('publishes each auth page as a subclass of its package base', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class]);

    $this->artisan('admin:install', ['--auth' => true])
        ->expectsOutputToContain('Published: app/Admin/Pages/Auth/LoginPage.php')
        ->expectsOutputToContain('redirectGuestsTo')
        ->doesntExpectOutputToContain('does not discover')
        ->assertSuccessful();

    foreach (['LoginPage', 'ForgotPasswordPage', 'ResetPasswordPage'] as $page) {
        expect(File::get($this->hostRoot."/app/Admin/Pages/Auth/{$page}.php"))
            ->toContain('namespace App\\Admin\\Pages\\Auth;')
            ->toContain("class {$page} extends \\Tbtop\\Admin\\Auth\\{$page} {}");
    }
});

it('leaves a published auth page untouched on a second run', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class]);
    $this->artisan('admin:install', ['--auth' => true])->assertSuccessful();
    File::put($this->hostRoot.'/app/Admin/Pages/Auth/LoginPage.php', '<?php // host edits');

    $this->artisan('admin:install', ['--auth' => true])
        ->expectsOutputToContain('Exists, left untouched: app/Admin/Pages/Auth/LoginPage.php')
        ->assertSuccessful();

    expect(File::get($this->hostRoot.'/app/Admin/Pages/Auth/LoginPage.php'))->toBe('<?php // host edits');
});

it('skips an auth page whose path the panel already serves', function () {
    authHost($this->hostRoot, [InstallLegacyLoginPanel::class]);

    $this->artisan('admin:install', ['--auth' => true])
        ->expectsOutputToContain('Skipped: '.InstallLegacyLoginPage::class.' already serves /admin/login')
        ->assertSuccessful();

    expect($this->hostRoot.'/app/Admin/Pages/Auth/LoginPage.php')->not->toBeFile()
        ->and($this->hostRoot.'/app/Admin/Pages/Auth/ForgotPasswordPage.php')->toBeFile();
});

it('asks for the panel when several are registered, before writing anything', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class, InstallLegacyLoginPanel::class]);

    $this->artisan('admin:install', ['--auth' => true])
        ->expectsOutputToContain('Several panels: pass --panel=<id>')
        ->assertFailed();

    expect($this->hostRoot.'/resources/js/admin.tsx')->not->toBeFile();
});

it('refuses --auth without a panel', function () {
    authHost($this->hostRoot, []);

    $this->artisan('admin:install', ['--auth' => true])->assertFailed();

    expect($this->hostRoot.'/app/Admin/Pages/Auth')->not->toBeDirectory();
});

it('names the discovery root when the panel does not pick the pages up', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class, InstallLegacyLoginPanel::class]);

    $this->artisan('admin:install', ['--auth' => true, '--panel' => 'legacy'])
        ->expectsOutputToContain('does not discover app/Admin/Pages')
        ->assertSuccessful();
});

final class InstallAuthPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('admin')->prefix('admin')->discoverPages(app_path('Admin/Pages'), 'App\\Admin\\Pages');
    }
}

final class InstallLegacyLoginPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('legacy')->prefix('admin')->pages([InstallLegacyLoginPage::class]);
    }
}

final class InstallLegacyLoginPage extends Page
{
    public static function path(): string
    {
        return 'login';
    }

    public function view(S $s): Node
    {
        return $s->stack([]);
    }
}
