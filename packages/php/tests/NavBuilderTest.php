<?php

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Navigation\NavBuilder;
use Tbtop\Admin\Tests\Fixtures\GatedNavPage;
use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;
use Tbtop\Admin\Tests\Fixtures\PostsIndexPage;

it('builds nav groups from page declarations, skipping parametrized and nav-less pages', function () {
    config()->set('tbtop-admin.prefix', 'admin');
    config()->set('tbtop-admin.pages', [
        PostEditPage::class,   // parametrized path — skipped
        PostsIndexPage::class, // nav() null — skipped
        NavPage::class,
    ]);

    expect(NavBuilder::build())->toBe([
        [
            'group' => 'Content',
            'items' => [
                ['label' => 'Nav Demo', 'href' => '/admin/nav-demo', 'order' => 2],
            ],
        ],
    ]);
});

it('NavBuilder: excludes gated page when current user fails the gate', function () {
    config()->set('tbtop-admin.prefix', 'admin');
    config()->set('tbtop-admin.pages', [NavPage::class, GatedNavPage::class]);

    Gate::define('view-gated', fn (?object $user) => false);

    $nav = NavBuilder::build();

    $labels = array_column($nav[0]['items'], 'label');
    expect($labels)->not->toContain('Gated Nav');
});

it('NavBuilder: includes gated page when current user passes the gate', function () {
    config()->set('tbtop-admin.prefix', 'admin');
    config()->set('tbtop-admin.pages', [NavPage::class, GatedNavPage::class]);

    Gate::define('view-gated', fn (?object $user) => true);

    $nav = NavBuilder::build();

    $labels = array_column($nav[0]['items'], 'label');
    expect($labels)->toContain('Gated Nav');
});
