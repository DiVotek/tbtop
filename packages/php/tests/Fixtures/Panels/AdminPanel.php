<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Panels\PanelConfig;
use Tbtop\Admin\Tests\Fixtures\NavPage;
use Tbtop\Admin\Tests\Fixtures\PostEditPage;
use Tbtop\Admin\Tests\Fixtures\PostsIndexPage;
use Tbtop\Admin\Tests\Fixtures\TranslatablePostsPage;

class AdminPanel extends TestPanel
{
    public function configure(PanelConfig $panel): PanelConfig
    {
        return parent::configure($panel)
            ->locales(['en', 'uk'])
            ->defaultLocale('en');
    }

    protected function pages(): array
    {
        return [
            PostEditPage::class,
            PostsIndexPage::class,
            TranslatablePostsPage::class,
            NavPage::class,
        ];
    }
}
