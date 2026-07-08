<?php

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Navigation\NavBuilder;
use Tbtop\Admin\Navigation\NavGroup;
use Tbtop\Admin\Navigation\NavItem;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\GatedNavPage;
use Tbtop\Admin\Tests\Fixtures\GatedNavParentPage;
use Tbtop\Admin\Tests\Fixtures\IconBadgeNavPage;
use Tbtop\Admin\Tests\Fixtures\NavAlphaGroupPage;
use Tbtop\Admin\Tests\Fixtures\NavBetaGroupPage;
use Tbtop\Admin\Tests\Fixtures\NavChildOfGatedParentPage;
use Tbtop\Admin\Tests\Fixtures\NavChildPage;
use Tbtop\Admin\Tests\Fixtures\NavCyclePageA;
use Tbtop\Admin\Tests\Fixtures\NavCyclePageB;
use Tbtop\Admin\Tests\Fixtures\NavOrphanChildPage;
use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\NavParentPage;
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
            'key' => 'Content',
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

it('NavBuilder: matches meta by the group key and emits the translated label', function () {
    // The page keys its group 'Content'; the NavGroup translates the display
    // label. Matching by key (not label) keeps meta attached under any locale.
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([NavPage::class])
            ->navigationGroups([
                NavGroup::make('Content')->label('Контент')->icon('file-text')->collapsed(),
            ])
    );

    $group = NavBuilder::build($panel)[0];

    expect($group)->toMatchArray([
        'group' => 'Контент',
        'icon' => ['name' => 'file-text', 'position' => 'left'],
        'collapsible' => true,
        'collapsed' => true,
    ]);
});

it('NavBuilder: a group without a NavGroup falls back to the key as its label', function () {
    $panel = panelWithPages([NavPage::class]);

    expect(NavBuilder::build($panel)[0]['group'])->toBe('Content');
});

it('NavBuilder: resolves a Closure label at build time, not config time', function () {
    // Panel config is a singleton, so a Closure label defers translation to
    // the request. Emulate a locale that changes after the group is declared.
    $locale = 'en';
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([NavPage::class])
            ->navigationGroups([
                NavGroup::make('Content')->label(function () use (&$locale): string {
                    return $locale === 'uk' ? 'Контент' : 'Content';
                }),
            ])
    );

    expect(NavBuilder::build($panel)[0]['group'])->toBe('Content');

    $locale = 'uk';
    expect(NavBuilder::build($panel)[0]['group'])->toBe('Контент');
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

it('NavBuilder: nests a child page under its parent via nav()[\'parent\']', function () {
    $panel = panelWithPages([NavParentPage::class, NavChildPage::class]);

    $group = NavBuilder::build($panel)[0];

    expect(array_column($group['items'], 'label'))->toBe(['Parent'])
        ->and($group['items'][0]['children'])->toBe([
            ['label' => 'Child', 'href' => '/admin/nav-child', 'order' => 1],
        ]);
});

it('NavBuilder: throws when nav()[\'parent\'] references a page outside the nav-eligible set', function () {
    $panel = panelWithPages([PostEditPage::class, NavOrphanChildPage::class]);

    NavBuilder::build($panel);
})->throws(InvalidArgumentException::class, 'not a nav-eligible page');

it('NavBuilder: throws when nav()[\'parent\'] references an unregistered class', function () {
    $panel = panelWithPages([NavChildPage::class]);

    NavBuilder::build($panel);
})->throws(InvalidArgumentException::class, 'not a nav-eligible page');

it('NavBuilder: throws on a nav parent cycle', function () {
    $panel = panelWithPages([NavCyclePageA::class, NavCyclePageB::class]);

    NavBuilder::build($panel);
})->throws(LogicException::class, 'cycle detected');

it('NavBuilder: promotes a child to top level when its parent fails the gate', function () {
    $panel = panelWithPages([GatedNavParentPage::class, NavChildOfGatedParentPage::class]);

    Gate::define('view-gated-parent', fn (?object $user) => false);

    $group = NavBuilder::build($panel)[0];

    expect(array_column($group['items'], 'label'))->toBe(['Child of gated']);
});

it('NavBuilder: keeps a child nested when both it and its parent pass the gate', function () {
    $panel = panelWithPages([GatedNavParentPage::class, NavChildOfGatedParentPage::class]);

    Gate::define('view-gated-parent', fn (?object $user) => true);

    $group = NavBuilder::build($panel)[0];

    expect(array_column($group['items'], 'label'))->toBe(['Gated Parent'])
        ->and(array_column($group['items'][0]['children'], 'label'))->toBe(['Child of gated']);
});

it('NavBuilder: orders groups per navigationGroups() declaration, not page registration order', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([NavBetaGroupPage::class, NavAlphaGroupPage::class])
            ->navigationGroups([NavGroup::make('Alpha'), NavGroup::make('Beta')])
    );

    expect(array_column(NavBuilder::build($panel), 'group'))->toBe(['Alpha', 'Beta']);
});

it('NavBuilder: an undeclared group sorts after every declared group, keeping first-seen order', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([NavBetaGroupPage::class, NavPage::class, NavAlphaGroupPage::class])
            ->navigationGroups([NavGroup::make('Alpha')])
    );

    expect(array_column(NavBuilder::build($panel), 'group'))->toBe(['Alpha', 'Beta', 'Content']);
});

it('NavBuilder: merges panel navigationItems() into their declared group alongside page items, sorted by order', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([NavPage::class])
            ->navigationItems([
                NavItem::make('Documentation')->url('https://example.test/docs')->icon('globe')
                    ->group('Content')->sort(1)->newTab(),
            ])
    );

    $group = NavBuilder::build($panel)[0];

    expect($group['group'])->toBe('Content')
        ->and($group['items'])->toBe([
            [
                'label' => 'Documentation',
                'href' => 'https://example.test/docs',
                'order' => 1,
                'icon' => ['name' => 'globe', 'position' => 'left'],
                'newTab' => true,
            ],
            ['label' => 'Nav Demo', 'href' => '/admin/nav-demo', 'order' => 2],
        ]);
});

it('NavBuilder: a navigationItems() entry without a group defaults to General', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([])
            ->navigationItems([NavItem::make('Docs')->url('https://example.test')])
    );

    expect(NavBuilder::build($panel))->toBe([
        ['key' => 'General', 'group' => 'General', 'items' => [['label' => 'Docs', 'href' => 'https://example.test', 'order' => 0]]],
    ]);
});

it('PanelConfig: exposes userMenuItems as sparse wire payloads through the current panel', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)->userMenuItems([
            NavItem::make('API Tokens')->url('/admin/api-tokens')->icon('key'),
        ])
    );

    expect($panel->userMenuItems())->toBe([
        ['label' => 'API Tokens', 'href' => '/admin/api-tokens', 'icon' => ['name' => 'key', 'position' => 'left']],
    ]);
});
