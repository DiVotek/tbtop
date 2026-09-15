<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Tbtop\Admin\Panels\PanelRegistry;
use Tbtop\Admin\Tests\PageDiscoveryTestCase;

uses(PageDiscoveryTestCase::class);

beforeEach(function () {
    $home = $this->writePage('ZHome', isPublic: true);
    $this->writePage('APublic', isPublic: true);
    $this->writePage('RestrictedPage');
    config(['discovery.manual' => [$home]]);
    Artisan::call('tbtop:cache-pages');
    $this->app->forgetInstance(PanelRegistry::class);
    require __DIR__.'/../routes/admin.php';
    Route::getRoutes()->refreshNameLookups();
});

it('renders a discovered page with its expected Inertia content', function () {
    $this->get('/discovery/APublic', ['X-Inertia' => 'true'])
        ->assertOk()->assertJsonPath('component', 'admin/page')
        ->assertJsonPath('props.slug', 'a-public')
        ->assertJsonPath('props.structure.options.children.0.options.content', 'discovered');
});

it('preserves public endpoint middleware overrides and the default auth boundary', function () {
    $routes = Route::getRoutes();
    $public = array_filter($routes->getRoutes(), fn ($route) => str_starts_with($route->getName() ?? '', 'tbtop.discovery.a-public'));
    expect(count($public))->toBeGreaterThan(1);
    foreach ($public as $route) {
        expect($route->middleware())->toContain('web')->not->toContain('auth:web');
    }
    $this->getJson('/discovery/RestrictedPage')->assertUnauthorized();
    $this->get('/discovery/APublic', ['X-Inertia' => 'true'])->assertOk();
});

it('keeps the manual home ahead of alphabetically earlier discovered pages', function () {
    $root = Route::getRoutes()->match(Request::create('/discovery'));
    expect(($root->getAction('uses'))()->getTargetUrl())->toEndWith('/discovery/ZHome');
});

it('serves discovered pages after serializing and loading compiled routes', function () {
    $routes = Route::getRoutes();
    foreach ($routes as $route) {
        $route->prepareForSerialization();
    }
    $compiled = unserialize(serialize($routes->compile()));
    app('router')->setCompiledRoutes($compiled);
    $this->get('/discovery/APublic', ['X-Inertia' => 'true'])
        ->assertOk()->assertJsonPath('props.slug', 'a-public')
        ->assertJsonPath('props.structure.options.children.0.options.content', 'discovered');
});
