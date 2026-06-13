<?php

use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;

// --------------------------------------------------------------------------
// breadcrumbs prop is present when config breadcrumbs = true (default)
// --------------------------------------------------------------------------
it('PageController: breadcrumbs prop is included in page response by default', function () {
    $response = $this->get('/admin/nav-demo', ['X-Inertia' => 'true']);

    $response->assertOk();
    $props = $response->json('props');
    expect($props)->toHaveKey('breadcrumbs')
        ->and($props['breadcrumbs'])->toBeArray();
});

// --------------------------------------------------------------------------
// breadcrumbs prop is absent when the panel disables it (PlainPanel, /plain)
// --------------------------------------------------------------------------
it('PageController: breadcrumbs prop is absent when the panel disables it', function () {
    $response = $this->get('/plain/nav-demo', ['X-Inertia' => 'true']);

    $response->assertOk();
    $props = $response->json('props');
    expect($props)->not->toHaveKey('breadcrumbs');
});

// --------------------------------------------------------------------------
// auto-built crumbs for NavPage: Content (no url) + Nav Demo (no url)
// --------------------------------------------------------------------------
it('PageController: auto-builds breadcrumbs for nav page', function () {
    $response = $this->get('/admin/nav-demo', ['X-Inertia' => 'true']);

    $response->assertOk();
    $crumbs = $response->json('props.breadcrumbs');
    // title() = Str::headline('NavPage') = 'Nav Page'; group from nav() = 'Content'
    expect($crumbs)->toBe([
        ['label' => 'Content'],
        ['label' => 'Nav Page'],
    ]);
});

// --------------------------------------------------------------------------
// parametrized page (PostEditPage) has no nav → single-crumb
// --------------------------------------------------------------------------
it('PageController: page with no nav gets single-item breadcrumb', function () {
    $response = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);

    $response->assertOk();
    $crumbs = $response->json('props.breadcrumbs');
    expect($crumbs)->toHaveCount(1)
        ->and($crumbs[0]['label'])->toBe('Post Edit Page');
});
