<?php

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Navigation\NavBuilder;
use Tbtop\Admin\Navigation\NavGroup;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\GatedNavPage;
use Tbtop\Admin\Tests\Fixtures\IconBadgeNavPage;
use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;
use Tbtop\Admin\Tests\Fixtures\PostsIndexPage;

it('builds nav groups from page declarations, skipping parametrized and nav-less pages', function () {
    $panel = panelWithPages([
        PostEditPage::class,   // parametrized path — skipped
        PostsIndexPage::class, // nav() null — skipped
        NavPage::class,
    ]);

    expect(NavBuilder::build($panel))->toBe([
        [
            'group' => 'Content',
            'items' => [
                ['label' => 'Nav Demo', 'href' => '/admin/nav-demo', 'order' => 2],
            ],
        ],
    ]);
});

it('NavBuilder: excludes gated page when current user fails the gate', function () {
    $panel = panelWithPages([NavPage::class, GatedNavPage::class]);

    Gate::define('view-gated', fn (?object $user) => false);

    $nav = NavBuilder::build($panel);

    $labels = array_column($nav[0]['items'], 'label');
    expect($labels)->not->toContain('Gated Nav');
});

it('NavBuilder: includes gated page when current user passes the gate', function () {
    $panel = panelWithPages([NavPage::class, GatedNavPage::class]);

    Gate::define('view-gated', fn (?object $user) => true);

    $nav = NavBuilder::build($panel);

    $labels = array_column($nav[0]['items'], 'label');
    expect($labels)->toContain('Gated Nav');
});

it('NavBuilder: normalizes item icon and casts badge with color', function () {
    $panel = panelWithPages([IconBadgeNavPage::class]);

    $item = NavBuilder::build($panel)[0]['items'][0];

    expect($item)->toMatchArray([
        'label' => 'Iconic',
        'href' => '/admin/iconic',
        'icon' => ['name' => 'star', 'position' => 'left'],
        'badge' => '3',
        'badgeColor' => 'danger',
    ]);
});

it('NavBuilder: merges group icon and collapsed meta from navigationGroups by label', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([NavPage::class])
            ->navigationGroups([
                NavGroup::make('Content')->icon('file-text')->collapsed(),
            ])
    );

    $group = NavBuilder::build($panel)[0];

    expect($group)->toMatchArray([
        'group' => 'Content',
        'icon' => ['name' => 'file-text', 'position' => 'left'],
        'collapsible' => true,
        'collapsed' => true,
    ]);
});

it('NavBuilder: a collapsible-only group omits collapsed and icon flags', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([NavPage::class])
            ->navigationGroups([NavGroup::make('Content')->collapsible()])
    );

    $group = NavBuilder::build($panel)[0];

    expect($group)->toHaveKey('collapsible')
        ->and($group)->not->toHaveKey('collapsed')
        ->and($group)->not->toHaveKey('icon');
});
