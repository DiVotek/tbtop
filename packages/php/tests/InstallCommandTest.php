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
        ->expectsOutputToContain('HandleInertiaRequests')
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

    foreach (['LoginPage', 'ForgotPasswordPage', 'ResetPasswordPage', 'ProfilePage', 'EmailVerificationPage'] as $page) {
        expect(File::get($this->hostRoot."/app/Admin/Pages/Auth/{$page}.php"))
            ->toContain('namespace App\\Admin\\Pages\\Auth;')
            ->toContain("class {$page} extends \\Tbtop\\Admin\\Auth\\{$page} {}");
    }
});

it('publishes only the profile page with --profile, without the login steps', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class]);

    $this->artisan('admin:install', ['--profile' => true])
        ->expectsOutputToContain('Published: app/Admin/Pages/Auth/ProfilePage.php')
        ->doesntExpectOutputToContain('redirectGuestsTo')
        ->assertSuccessful();

    expect(File::get($this->hostRoot.'/app/Admin/Pages/Auth/ProfilePage.php'))
        ->toContain('class ProfilePage extends \\Tbtop\\Admin\\Auth\\ProfilePage {}')
        ->and($this->hostRoot.'/app/Admin/Pages/Auth/LoginPage.php')->not->toBeFile();
});

it('refuses --profile without a panel', function () {
    authHost($this->hostRoot, []);

    $this->artisan('admin:install', ['--profile' => true])
        ->expectsOutputToContain('before --auth, --2fa or --profile')
        ->assertFailed();
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

    $this->artisan('admin:install', ['--auth' => true])
        ->expectsOutputToContain("'panels' => [\\App\\Admin\\AdminPanel::class],")
        ->expectsOutputToContain('https://docs.tbtop.dev/docs/getting-started/panel')
        ->assertFailed();

    expect($this->hostRoot.'/app/Admin/Pages/Auth')->not->toBeDirectory();
});

it('names the discovery root when the panel does not pick the pages up', function () {
    authHost($this->hostRoot, [InstallLegacyLoginPanel::class]);

    $this->artisan('admin:install', ['--auth' => true])
        ->expectsOutputToContain('does not discover app/Admin/Pages;')
        ->expectsOutputToContain("->discoverPages(in: app_path('Admin/Pages'), for: 'App\\Admin\\Pages')")
        ->assertSuccessful();
});

it('keeps a lone panel that discovers nothing on the shared directory when run again', function () {
    authHost($this->hostRoot, [InstallLegacyLoginPanel::class]);
    $this->artisan('admin:install', ['--profile' => true])->assertSuccessful();

    $this->artisan('admin:install', ['--profile' => true])
        ->expectsOutputToContain('Exists, left untouched: app/Admin/Pages/Auth/ProfilePage.php')
        ->assertSuccessful();

    expect($this->hostRoot.'/app/Admin/Legacy')->not->toBeDirectory();
});

it('publishes a second panel\'s auth pages under its own discovery root', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class, InstallOpsPanel::class]);
    $this->artisan('admin:install', ['--auth' => true, '--panel' => 'admin'])->assertSuccessful();

    $this->artisan('admin:install', ['--auth' => true, '--panel' => 'ops'])
        ->expectsOutputToContain('Published: app/Ops/Pages/Auth/LoginPage.php')
        ->doesntExpectOutputToContain('Exists, left untouched: app/Admin')
        ->doesntExpectOutputToContain('does not discover')
        ->assertSuccessful();

    expect(File::get($this->hostRoot.'/app/Ops/Pages/Auth/LoginPage.php'))->toContain('namespace App\\Ops\\Pages\\Auth;')
        ->and(File::get($this->hostRoot.'/app/Admin/Pages/Auth/LoginPage.php'))->toContain('namespace App\\Admin\\Pages\\Auth;');
});

it('gives a panel that discovers nothing its own directory once another panel owns the shared one', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class, InstallLegacyLoginPanel::class]);

    $this->artisan('admin:install', ['--auth' => true, '--panel' => 'legacy'])
        ->expectsOutputToContain('Published: app/Admin/Legacy/Pages/Auth/ForgotPasswordPage.php')
        ->expectsOutputToContain("->discoverPages(in: app_path('Admin/Legacy/Pages'), for: 'App\\Admin\\Legacy\\Pages')")
        ->assertSuccessful();

    expect($this->hostRoot.'/app/Admin/Pages/Auth')->not->toBeDirectory();
});

it('gives the second of two panels that discover nothing its own directory', function () {
    authHost($this->hostRoot, [InstallManualPanel::class, InstallLegacyLoginPanel::class]);
    $this->artisan('admin:install', ['--profile' => true, '--panel' => 'manual'])
        ->expectsOutputToContain('Published: app/Admin/Pages/Auth/ProfilePage.php')
        ->assertSuccessful();

    $this->artisan('admin:install', ['--profile' => true, '--panel' => 'legacy'])
        ->expectsOutputToContain('Published: app/Admin/Legacy/Pages/Auth/ProfilePage.php')
        ->assertSuccessful();
});

it('refuses a panel whose auth pages another panel would discover too', function () {
    authHost($this->hostRoot, [InstallWideRootPanel::class, InstallNestedRootPanel::class]);

    $this->artisan('admin:install', ['--auth' => true, '--panel' => 'nested'])
        ->expectsOutputToContain('Panel [wide] already discovers or serves pages from app/Admin/Nested/Auth')
        ->assertFailed();

    expect($this->hostRoot.'/app/Admin/Nested/Auth')->not->toBeDirectory()
        ->and($this->hostRoot.'/resources/js/admin.tsx')->not->toBeFile();
});

it('publishes the auth pages, the challenge page and the migration once with --2fa', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class]);

    $this->artisan('admin:install', ['--2fa' => true])
        ->expectsOutputToContain('Published: app/Admin/Pages/Auth/TwoFactorChallengePage.php')
        ->expectsOutputToContain('redirectGuestsTo')
        ->expectsOutputToContain('composer require pragmarx/google2fa bacon/bacon-qr-code')
        ->assertSuccessful();

    expect(File::get($this->hostRoot.'/app/Admin/Pages/Auth/TwoFactorChallengePage.php'))
        ->toContain('class TwoFactorChallengePage extends \\Tbtop\\Admin\\Auth\\TwoFactorChallengePage {}')
        ->and($this->hostRoot.'/app/Admin/Pages/Auth/LoginPage.php')->toBeFile()
        ->and(File::glob($this->hostRoot.'/database/migrations/*_add_two_factor_columns_to_users_table.php'))->toHaveCount(1);

    $this->artisan('admin:install', ['--2fa' => true])->expectsOutputToContain('Exists, left untouched: database/migrations/')->assertSuccessful();
    expect(File::glob($this->hostRoot.'/database/migrations/*.php'))->toHaveCount(1);
});

it('publishes no challenge page with --auth alone', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class]);

    $this->artisan('admin:install', ['--auth' => true])->doesntExpectOutputToContain('google2fa')->assertSuccessful();

    expect($this->hostRoot.'/app/Admin/Pages/Auth/TwoFactorChallengePage.php')->not->toBeFile()
        ->and($this->hostRoot.'/database/migrations')->not->toBeDirectory();
});

final class InstallAuthPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('admin')->prefix('admin')->discoverPages(app_path('Admin/Pages'), 'App\\Admin\\Pages');
    }
}

it('refuses a panel whose discovery root holds the shared directory another panel registers pages from', function () {
    authHost($this->hostRoot, [InstallAuthPanel::class, InstallHandPanel::class]);
    File::makeDirectory($this->hostRoot.'/app/Admin/Pages/Auth', 0755, true);
    File::put($this->hostRoot.'/app/Admin/Pages/Auth/HandLoginPage.php', "<?php\nnamespace App\\Admin\\Pages\\Auth;\nclass HandLoginPage extends \\Tbtop\\Admin\\Auth\\LoginPage {}\n");
    require_once $this->hostRoot.'/app/Admin/Pages/Auth/HandLoginPage.php';

    $this->artisan('admin:install', ['--auth' => true, '--panel' => 'admin'])
        ->expectsOutputToContain('Panel [hand] already discovers or serves pages from app/Admin/Pages/Auth')
        ->assertFailed();

    expect($this->hostRoot.'/app/Admin/Pages/Auth/LoginPage.php')->not->toBeFile();
});

it('counts pages a discovering panel also lists by hand as its own', function () {
    authHost($this->hostRoot, [InstallOpsHandPanel::class, InstallLegacyLoginPanel::class]);
    // Loaded from outside the shared directory, so only the hand listing can make it owned.
    File::put($this->hostRoot.'/OpsHandLoginPage.php', "<?php\nnamespace App\\Admin\\Pages\\Auth;\nclass OpsHandLoginPage extends \\Tbtop\\Admin\\Auth\\LoginPage {}\n");
    require_once $this->hostRoot.'/OpsHandLoginPage.php';

    $this->artisan('admin:install', ['--profile' => true, '--panel' => 'legacy'])
        ->expectsOutputToContain('Published: app/Admin/Legacy/Pages/Auth/ProfilePage.php')
        ->assertSuccessful();
});

final class InstallOpsHandPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('opshand')->prefix('opshand')
            ->discoverPages(app_path('Ops/Pages'), 'App\\Ops\\Pages')
            ->pages(['App\\Admin\\Pages\\Auth\\OpsHandLoginPage']);
    }
}

final class InstallHandPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('hand')->prefix('hand')->pages(['App\\Admin\\Pages\\Auth\\HandLoginPage']);
    }
}

final class InstallOpsPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('ops')->prefix('ops')->discoverPages(app_path('Ops/Pages'), 'App\\Ops\\Pages');
    }
}

final class InstallManualPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('manual')->prefix('manual');
    }
}

final class InstallWideRootPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('wide')->prefix('wide')->discoverPages(app_path('Admin'), 'App\\Admin');
    }
}

final class InstallNestedRootPanel extends Panel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return $panel->id('nested')->prefix('nested')->discoverPages(app_path('Admin/Nested'), 'App\\Admin\\Nested');
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
