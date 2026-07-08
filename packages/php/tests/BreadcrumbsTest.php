<?php

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Navigation\BreadcrumbsBuilder;
use Tbtop\Admin\Navigation\NavGroup;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\PostsIndexPage;

// --------------------------------------------------------------------------
// Auto-build: page without nav() → single crumb (title only, no url)
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: page with no nav() returns single crumb with title only', function () {
    $page = new PostsIndexPage;
    $crumbs = BreadcrumbsBuilder::build($page, panelWithPages([PostsIndexPage::class]));

    expect($crumbs)->toBe([['label' => 'Posts Index Page']]);
});

// --------------------------------------------------------------------------
// Auto-build: page in nav group, no other page in group → group label (no url) + title
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: page with nav() returns group + title, group without url when alone', function () {
    $page = new NavPage;
    $crumbs = BreadcrumbsBuilder::build($page, panelWithPages([NavPage::class]));

    // title() = Str::headline('NavPage') = 'Nav Page'; nav label is 'Nav Demo'
    expect($crumbs)->toBe([
        ['label' => 'Content'],
        ['label' => 'Nav Page'],
    ]);
});

// --------------------------------------------------------------------------
// Auto-build: the group crumb shows the translated NavGroup label, not the key
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: group crumb uses the translated NavGroup label', function () {
    $panel = new CurrentPanel(
        (new PanelConfig)
            ->id('admin')
            ->prefix('admin')
            ->pages([NavPage::class])
            ->navigationGroups([NavGroup::make('Content')->label('Контент')])
    );

    $crumbs = BreadcrumbsBuilder::build(new NavPage, $panel);

    expect($crumbs[0])->toBe(['label' => 'Контент']);
});

// --------------------------------------------------------------------------
// Auto-build: parametrized page in nav group, sibling page provides group url
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: parametrized page gets group url from non-parametrized sibling', function () {
    // Build a quick fixture that sits in the same group as NavPage but has a param
    $page = new class extends Page
    {
        public static function path(): string
        {
            return 'content/{item}/edit';
        }

        public static function nav(): ?array
        {
            return ['group' => 'Content', 'label' => 'Edit Item', 'order' => 3];
        }

        public function title(): string
        {
            return 'Edit Item';
        }

        public function view(S $s): Node
        {
            return $s->stack([]);
        }
    };

    // The panel registers the anonymous page and NavPage (non-parametrized sibling in same group)
    $crumbs = BreadcrumbsBuilder::build($page, panelWithPages([NavPage::class, $page::class]));

    // NavPage is at /admin/nav-demo, same group "Content"
    expect($crumbs[0])->toBe(['label' => 'Content', 'url' => '/admin/nav-demo'])
        ->and($crumbs[1])->toBe(['label' => 'Edit Item']);
});

// --------------------------------------------------------------------------
// Override: array breadcrumbs
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: array override is returned as-is', function () {
    $page = new class extends Page
    {
        public static function path(): string
        {
            return 'override-page';
        }

        public function title(): string
        {
            return 'Override Page';
        }

        public function breadcrumbs(): array|Closure|null
        {
            return [
                ['label' => 'Home', 'url' => '/admin'],
                ['label' => 'Override Page'],
            ];
        }

        public function view(S $s): Node
        {
            return $s->stack([]);
        }
    };

    $crumbs = BreadcrumbsBuilder::build($page, panelWithPages([]));

    expect($crumbs)->toBe([
        ['label' => 'Home', 'url' => '/admin'],
        ['label' => 'Override Page'],
    ]);
});

// --------------------------------------------------------------------------
// Override: Closure receives page instance
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: closure override receives page instance and returns breadcrumbs', function () {
    $page = new class extends Page
    {
        public string $recordTitle = 'My Record';

        public static function path(): string
        {
            return 'items/{item}/edit';
        }

        public function title(): string
        {
            return $this->recordTitle;
        }

        public function breadcrumbs(): array|Closure|null
        {
            return function (self $p): array {
                return [
                    ['label' => 'Items', 'url' => '/admin/items'],
                    ['label' => $p->recordTitle],
                ];
            };
        }

        public function view(S $s): Node
        {
            return $s->stack([]);
        }
    };

    $crumbs = BreadcrumbsBuilder::build($page, panelWithPages([]));

    expect($crumbs)->toBe([
        ['label' => 'Items', 'url' => '/admin/items'],
        ['label' => 'My Record'],
    ]);
});
