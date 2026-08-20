<?php

use Illuminate\Support\Facades\File;

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
