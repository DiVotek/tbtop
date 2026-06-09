<?php

use Tbtop\Admin\Navigation\NavBuilder;
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
