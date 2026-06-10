<?php

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\PageGateHttpTestCase;

uses(PageGateHttpTestCase::class);

// ---------------------------------------------------------------------------
// Gate check: page render
// ---------------------------------------------------------------------------

it('PageGate: gated page render returns 403 when gate denies', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => false);

    $this->get('/admin/gated-endpoints', ['X-Inertia' => 'true'])->assertForbidden();
});

it('PageGate: gated page render returns 200 when gate allows', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => true);

    $this->get('/admin/gated-endpoints', ['X-Inertia' => 'true'])->assertOk();
});

it('PageGate: ungated page render passes through unchanged', function (): void {
    Schema::create('posts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->integer('views')->default(0);
        $table->boolean('published')->default(false);
    });

    $this->get('/admin/posts', ['X-Inertia' => 'true'])->assertOk();
});

// ---------------------------------------------------------------------------
// Gate check: table data endpoint
// ---------------------------------------------------------------------------

it('PageGate: gated table endpoint returns 403 when gate denies', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => false);

    $this->getJson('/admin/gated-endpoints/tables/items')->assertForbidden();
});

it('PageGate: gated table endpoint returns 200 when gate allows', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => true);

    $this->getJson('/admin/gated-endpoints/tables/items')->assertOk();
});

// ---------------------------------------------------------------------------
// Gate check: chart/data endpoint
// ---------------------------------------------------------------------------

it('PageGate: gated data endpoint returns 403 when gate denies', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => false);

    $this->getJson('/admin/gated-endpoints/data/summary')->assertForbidden();
});

it('PageGate: gated data endpoint returns 200 when gate allows', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => true);

    $this->getJson('/admin/gated-endpoints/data/summary')->assertOk();
});

// ---------------------------------------------------------------------------
// Gate check: form submit endpoint
// ---------------------------------------------------------------------------

it('PageGate: gated form submit returns 403 when gate denies', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => false);

    $this->post('/admin/gated-endpoints/forms/main', ['name' => 'Test'])->assertForbidden();
});

it('PageGate: gated form submit executes when gate allows', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => true);

    $this->post('/admin/gated-endpoints/forms/main', ['name' => 'Test'])->assertRedirect();
});

// ---------------------------------------------------------------------------
// Gate check: action endpoint
// ---------------------------------------------------------------------------

it('PageGate: gated action endpoint returns 403 when gate denies', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => false);

    $this->postJson('/admin/gated-endpoints/actions/ping', ['payload' => []])->assertForbidden();
});

it('PageGate: gated action endpoint returns 200 when gate allows', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => true);

    $this->postJson('/admin/gated-endpoints/actions/ping', ['payload' => []])->assertOk();
});

// ---------------------------------------------------------------------------
// Gate check: select-create endpoint
// ---------------------------------------------------------------------------

it('PageGate: gated select-create endpoint returns 403 when gate denies', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => false);

    $this->postJson('/admin/gated-endpoints/select-create/category_id', ['title' => 'X'])->assertForbidden();
});

it('PageGate: gated select-create endpoint returns 200 when gate allows', function (): void {
    Gate::define('view-gated-endpoints', fn (?object $user) => true);

    $this->postJson('/admin/gated-endpoints/select-create/category_id', ['title' => 'X'])->assertOk();
});
