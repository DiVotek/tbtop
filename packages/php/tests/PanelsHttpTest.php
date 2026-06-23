<?php

use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\Route;

// Two panels are registered: AdminPanel (/admin, guard 'web', locales en/uk)
// and OpsPanel (/ops, guard 'staff', locales fr/en). See PanelsHttpTestCase.

it('registers page, media and locale routes under each panel name', function () {
    expect(Route::has('tbtop.admin.nav-page'))->toBeTrue()
        ->and(Route::has('tbtop.admin.post-edit-page'))->toBeTrue()
        ->and(Route::has('tbtop.admin.post-edit-page.form'))->toBeTrue()
        ->and(Route::has('tbtop.admin.post-edit-page.action'))->toBeTrue()
        ->and(Route::has('tbtop.admin.media.index'))->toBeTrue()
        ->and(Route::has('tbtop.admin.locale'))->toBeTrue()
        ->and(Route::has('tbtop.ops.nav-page'))->toBeTrue()
        ->and(Route::has('tbtop.ops.ops-only-page'))->toBeTrue()
        ->and(Route::has('tbtop.ops.media.index'))->toBeTrue()
        ->and(Route::has('tbtop.ops.locale'))->toBeTrue();
});

it('mounts panel routes under their own prefixes', function () {
    expect(route('tbtop.admin.nav-page', absolute: false))->toBe('/admin/nav-demo')
        ->and(route('tbtop.ops.nav-page', absolute: false))->toBe('/ops/nav-demo');
});

it('scopes nav to the requested panel pages and prefix', function () {
    $this->actingAs(new AuthUser);
    $adminNav = $this->get('/admin/nav-demo', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.tbtop.nav');

    $this->actingAs(new AuthUser, 'staff');
    $opsNav = $this->get('/ops/nav-demo', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.tbtop.nav');

    $adminHrefs = array_merge(...array_map(fn (array $g) => array_column($g['items'], 'href'), $adminNav));
    $opsHrefs = array_merge(...array_map(fn (array $g) => array_column($g['items'], 'href'), $opsNav));

    expect($adminHrefs)->toBe(['/admin/nav-demo'])
        ->and($opsHrefs)->toContain('/ops/nav-demo', '/ops/ops-only')
        ->and($adminHrefs)->not->toContain('/ops/ops-only');
});

it('rejects a user authenticated against another panel guard', function () {
    $this->actingAs(new AuthUser, 'web');

    $this->getJson('/ops/nav-demo')->assertUnauthorized();
});

it('rejects the staff user on the web-guarded panel', function () {
    $this->actingAs(new AuthUser, 'staff');

    $this->getJson('/admin/nav-demo')->assertUnauthorized();
});

it('shares chrome trees per panel: package default and the panel-configured class', function () {
    $this->actingAs(new AuthUser);
    $adminChrome = $this->get('/admin/nav-demo', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.tbtop.chrome');

    $this->actingAs(new AuthUser, 'staff');
    $opsChrome = $this->get('/ops/nav-demo', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.tbtop.chrome');

    $kinds = fn (array $area): array => array_column($area['options']['children'], 'kind');

    // AdminPanel sets no chrome class → package default.
    expect($adminChrome['sidebar']['kind'])->toBe('stack')
        ->and($kinds($adminChrome['sidebar']))->toBe(['logo', 'navMenu'])
        ->and($kinds($adminChrome['header']))->toBe(['userMenu'])
        ->and($adminChrome['footer'])->toBeNull()
        // OpsPanel resolves its own Chrome class with an appended action.
        ->and($kinds($opsChrome['header']))->toBe(['userMenu', 'action']);
});

it('shares the panel id and the panel UI locales per request', function () {
    $this->actingAs(new AuthUser);
    $adminProps = $this->get('/admin/nav-demo', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.tbtop');

    $this->actingAs(new AuthUser, 'staff');
    $opsProps = $this->get('/ops/nav-demo', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.tbtop');

    expect($adminProps['panel'])->toBe('admin')
        ->and($adminProps['locales'])->toBe(['en', 'uk'])
        ->and($adminProps['locale'])->toBe('en')
        ->and($adminProps['prefix'])->toBe('/admin')
        ->and($adminProps['apiBase'])->toBe('/admin/api')
        ->and($opsProps['panel'])->toBe('ops')
        ->and($opsProps['locales'])->toBe(['fr', 'en'])
        ->and($opsProps['locale'])->toBe('fr')
        ->and($opsProps['prefix'])->toBe('/ops')
        ->and($opsProps['apiBase'])->toBe('/ops/api');
});
