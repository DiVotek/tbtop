<?php

use Illuminate\Foundation\Auth\User as AuthUser;

// Two panels are registered (AdminPanel at /admin, OpsPanel at /ops); each
// carries its own fallback, so an unknown URL 404s inside the right chrome.

it('renders an unknown URL under each panel prefix as the admin/error page with that panel chrome', function () {
    $this->actingAs(new AuthUser);
    $admin = $this->get('/admin/definitely/not/a/page', ['X-Inertia' => 'true'])
        ->assertNotFound()
        ->assertHeader('X-Inertia', 'true');

    expect($admin->json('component'))->toBe('admin/error')
        ->and($admin->json('props.status'))->toBe(404)
        ->and($admin->json('props.title'))->toBe('Page not found')
        ->and($admin->json('props.tbtop.panel'))->toBe('admin');

    $this->actingAs(new AuthUser, 'staff');
    $ops = $this->get('/ops/definitely/not/a/page', ['X-Inertia' => 'true'])->assertNotFound();

    expect($ops->json('component'))->toBe('admin/error')
        ->and($ops->json('props.tbtop.panel'))->toBe('ops');
});

it('renders the error page as a full document on a plain (non-Inertia) GET', function () {
    $this->actingAs(new AuthUser);

    $this->get('/admin/definitely/not/a/page')
        ->assertNotFound()
        ->assertSee('data-page', escape: false)
        // The page object is JSON-encoded into the attribute, where "/" is escaped.
        ->assertSee('admin\/error', escape: false);
});

it('keeps the panel fallback behind the panel auth stack', function () {
    $this->get('/admin/definitely/not/a/page', ['Accept' => 'application/json'])->assertUnauthorized();
});

it('leaves URLs outside every panel prefix to the app handler', function () {
    $this->actingAs(new AuthUser);

    $this->get('/definitely/not/a/page', ['X-Inertia' => 'true'])
        ->assertNotFound()
        ->assertHeaderMissing('X-Inertia');
});
