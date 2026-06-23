<?php

use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Tests\Fixtures\PublicLoginPage;
use Tbtop\Admin\Tests\MiddlewareOverrideHttpTestCase;

uses(MiddlewareOverrideHttpTestCase::class);

// One panel (/admin, guard 'web'): NavPage inherits the panel stack,
// PublicLoginPage overrides to ['web'], StricterPage spreads authStack + can.

// ---------------------------------------------------------------------------
// (a) Inheriting page still requires auth — no regression.
// ---------------------------------------------------------------------------

it('MiddlewareOverride: inheriting page still 401s unauthenticated', function (): void {
    $this->getJson('/admin/nav-demo')->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// (b) Public override reachable unauthenticated — page and form endpoint.
// ---------------------------------------------------------------------------

it('MiddlewareOverride: public page renders unauthenticated', function (): void {
    $this->get('/admin/public-login', ['X-Inertia' => 'true'])->assertOk();
});

it('MiddlewareOverride: public form endpoint submits unauthenticated', function (): void {
    $this->post('/admin/public-login/forms/login', ['email' => 'a@b.c', 'password' => 'x'])
        ->assertRedirect('/done');

    expect(PublicLoginPage::$submitted)->toBe(['email' => 'a@b.c', 'password' => 'x']);
});

// ---------------------------------------------------------------------------
// (c) Stricter override: keeps auth:web, adds the super-admin gate.
// ---------------------------------------------------------------------------

it('MiddlewareOverride: stricter page 401s unauthenticated', function (): void {
    $this->getJson('/admin/stricter')->assertUnauthorized();
});

it('MiddlewareOverride: stricter page 403s when the added gate denies', function (): void {
    Gate::define('super-admin', fn (?object $user) => false);
    $this->actingAs(new AuthUser);

    $this->get('/admin/stricter', ['X-Inertia' => 'true'])->assertForbidden();
});

it('MiddlewareOverride: stricter page renders when authed and the gate allows', function (): void {
    Gate::define('super-admin', fn (?object $user) => true);
    $this->actingAs(new AuthUser);

    $this->get('/admin/stricter', ['X-Inertia' => 'true'])->assertOk();
});

// ---------------------------------------------------------------------------
// (d) Public page still gets panel binding + locale (SetCurrentPanel ran).
// ---------------------------------------------------------------------------

it('MiddlewareOverride: public page still shares panel/chrome props', function (): void {
    $props = $this->get('/admin/public-login', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.tbtop');

    expect($props['panel'])->toBe('admin')
        ->and($props['prefix'])->toBe('/admin')
        ->and($props['chrome'])->not->toBeNull();
});

// ---------------------------------------------------------------------------
// (e) Chrome cluster (media/upload/locale) stays in the guarded default group.
// ---------------------------------------------------------------------------

it('MiddlewareOverride: chrome cluster stays guarded', function (): void {
    $this->postJson('/admin/api/media/upload', [])->assertUnauthorized();
    $this->postJson('/admin/locale', [])->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// Route names unchanged across the multi-group split.
// ---------------------------------------------------------------------------

it('MiddlewareOverride: route names resolve across all groups', function (): void {
    expect(Route::has('tbtop.admin.nav-page'))->toBeTrue()
        ->and(Route::has('tbtop.admin.public-login-page'))->toBeTrue()
        ->and(Route::has('tbtop.admin.public-login-page.form'))->toBeTrue()
        ->and(Route::has('tbtop.admin.stricter-page'))->toBeTrue()
        ->and(Route::has('tbtop.admin.media.index'))->toBeTrue()
        ->and(Route::has('tbtop.admin.locale'))->toBeTrue();
});
