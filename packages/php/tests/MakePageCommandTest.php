<?php

use Illuminate\Support\Facades\File;
use Tbtop\Admin\Tests\TestCase;

uses(TestCase::class);

// The command writes files under app_path('Admin/Pages/').
// Each test resolves the expected output path, asserts content, then cleans up.

function expectedPagePath(string $class): string
{
    return app_path('Admin/Pages/'.$class.'.php');
}

afterEach(function () {
    $dir = app_path('Admin/Pages');
    if (is_dir($dir)) {
        File::deleteDirectory($dir);
    }
});

it('generates the correct file and class for a given name', function () {
    $this->artisan('make:tbtop-page', ['name' => 'Orders'])
        ->assertSuccessful()
        ->expectsOutputToContain('Register OrdersPage in your panel/config pages list.');

    $path = expectedPagePath('OrdersPage');
    expect(file_exists($path))->toBeTrue();

    $contents = file_get_contents($path);
    expect($contents)
        ->toContain('class OrdersPage extends Page')
        ->toContain("return 'orders';")
        ->toContain("'group' => 'Main'")
        ->toContain("'label' => 'Orders'")
        ->toContain("\$s->displayText('Orders')->variant('heading')");
});

it('appends the Page suffix only once when name already ends with Page', function () {
    $this->artisan('make:tbtop-page', ['name' => 'OrdersPage'])
        ->assertSuccessful();

    $path = expectedPagePath('OrdersPage');
    expect(file_exists($path))->toBeTrue();

    $contents = file_get_contents($path);
    expect($contents)->toContain('class OrdersPage extends Page');
});

it('uses --path option to override the route path', function () {
    $this->artisan('make:tbtop-page', ['name' => 'Orders', '--path' => 'custom/orders'])
        ->assertSuccessful();

    $contents = file_get_contents(expectedPagePath('OrdersPage'));
    expect($contents)->toContain("return 'custom/orders';");
});

it('uses --group option to set the nav group', function () {
    $this->artisan('make:tbtop-page', ['name' => 'Reports', '--group' => 'Analytics'])
        ->assertSuccessful();

    $contents = file_get_contents(expectedPagePath('ReportsPage'));
    expect($contents)->toContain("'group' => 'Analytics'");
});

it('generates nav returning null when --no-nav is given', function () {
    $this->artisan('make:tbtop-page', ['name' => 'Hidden', '--no-nav' => true])
        ->assertSuccessful();

    $contents = file_get_contents(expectedPagePath('HiddenPage'));
    expect($contents)
        ->toContain('return null;')
        ->not->toContain("'group'");
});

it('refuses to overwrite an existing file without --force', function () {
    $path = expectedPagePath('OrdersPage');
    File::ensureDirectoryExists(dirname($path));
    file_put_contents($path, '<?php // original');

    $this->artisan('make:tbtop-page', ['name' => 'Orders'])
        ->assertFailed()
        ->expectsOutputToContain('File already exists');

    expect(file_get_contents($path))->toBe('<?php // original');
});

it('overwrites an existing file when --force is passed', function () {
    $path = expectedPagePath('OrdersPage');
    File::ensureDirectoryExists(dirname($path));
    file_put_contents($path, '<?php // original');

    $this->artisan('make:tbtop-page', ['name' => 'Orders', '--force' => true])
        ->assertSuccessful();

    expect(file_get_contents($path))->not->toBe('<?php // original');
});
