<?php

use Tbtop\Admin\Auth\LoginPage as BaseLoginPage;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelRegistry;
use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;
use Tbtop\Admin\Tests\PageUrlHttpTestCase;

uses(PageUrlHttpTestCase::class);

it('builds a page URL with its route parameters outside a request', function () {
    expect(PostEditPage::url(['post' => 5]))->toBe('/admin/posts/5/edit');
});

it('picks the named panel', function () {
    expect(NavPage::url(panel: 'plain'))->toBe('/plain/nav-demo')
        ->and(NavPage::url(panel: 'admin'))->toBe('/admin/nav-demo');
});

it('prefers the current request panel', function () {
    app()->instance(CurrentPanel::class, new CurrentPanel(app(PanelRegistry::class)->get('plain')));

    expect(NavPage::url())->toBe('/plain/nav-demo');
});

it('refuses to guess between several panels', function () {
    NavPage::url();
})->throws(LogicException::class, 'registered in several panels (admin, plain)');

it('refuses a panel the page is not in', function () {
    PostEditPage::url(['post' => 1], 'plain');
})->throws(LogicException::class, 'not registered in panel [plain]');

it('refuses a page no panel registers', function () {
    BaseLoginPage::url();
})->throws(LogicException::class, 'not registered in any panel');
