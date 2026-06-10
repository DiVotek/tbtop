<?php

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Navigation\BreadcrumbsBuilder;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;
use Tbtop\Admin\Tests\Fixtures\PostsIndexPage;

// --------------------------------------------------------------------------
// Auto-build: page without nav() → single crumb (title only, no url)
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: page with no nav() returns single crumb with title only', function () {
    config()->set('tbtop-admin.prefix', 'admin');
    config()->set('tbtop-admin.pages', [PostsIndexPage::class]);

    $page = new PostsIndexPage;
    $crumbs = BreadcrumbsBuilder::build($page);

    expect($crumbs)->toBe([['label' => 'Posts Index Page']]);
});

// --------------------------------------------------------------------------
// Auto-build: page in nav group, no other page in group → group label (no url) + title
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: page with nav() returns group + title, group without url when alone', function () {
    config()->set('tbtop-admin.prefix', 'admin');
    config()->set('tbtop-admin.pages', [NavPage::class]);

    $page = new NavPage;
    $crumbs = BreadcrumbsBuilder::build($page);

    // title() = Str::headline('NavPage') = 'Nav Page'; nav label is 'Nav Demo'
    expect($crumbs)->toBe([
        ['label' => 'Content'],
        ['label' => 'Nav Page'],
    ]);
});

// --------------------------------------------------------------------------
// Auto-build: parametrized page in nav group, sibling page provides group url
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: parametrized page gets group url from non-parametrized sibling', function () {
    config()->set('tbtop-admin.prefix', 'admin');
    config()->set('tbtop-admin.pages', [PostEditPage::class, NavPage::class]);

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

    // Register the anonymous page and NavPage (non-parametrized sibling in same group)
    config()->set('tbtop-admin.pages', [NavPage::class, $page::class]);

    $crumbs = BreadcrumbsBuilder::build($page);

    // NavPage is at /admin/nav-demo, same group "Content"
    expect($crumbs[0])->toBe(['label' => 'Content', 'url' => '/admin/nav-demo'])
        ->and($crumbs[1])->toBe(['label' => 'Edit Item']);
});

// --------------------------------------------------------------------------
// Override: array breadcrumbs
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: array override is returned as-is', function () {
    config()->set('tbtop-admin.prefix', 'admin');
    config()->set('tbtop-admin.pages', []);

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

    $crumbs = BreadcrumbsBuilder::build($page);

    expect($crumbs)->toBe([
        ['label' => 'Home', 'url' => '/admin'],
        ['label' => 'Override Page'],
    ]);
});

// --------------------------------------------------------------------------
// Override: Closure receives page instance
// --------------------------------------------------------------------------
it('BreadcrumbsBuilder: closure override receives page instance and returns breadcrumbs', function () {
    config()->set('tbtop-admin.prefix', 'admin');
    config()->set('tbtop-admin.pages', []);

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

    $crumbs = BreadcrumbsBuilder::build($page);

    expect($crumbs)->toBe([
        ['label' => 'Items', 'url' => '/admin/items'],
        ['label' => 'My Record'],
    ]);
});
