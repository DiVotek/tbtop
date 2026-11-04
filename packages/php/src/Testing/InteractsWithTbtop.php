<?php

namespace Tbtop\Admin\Testing;

use Tbtop\Admin\Pages\Page;

/**
 * For PHPUnit test cases: $this->tbtop(EditPostPage::class, ['post' => $post]).
 * Pest tests call the global tbtop() function instead.
 */
trait InteractsWithTbtop
{
    /**
     * Visit an admin page as the current actingAs() user.
     *
     * @param  class-string<Page>  $page
     * @param  array<string, mixed>  $params  route parameters of the page's path()
     */
    public function tbtop(string $page, array $params = [], ?string $panel = null): PageTester
    {
        return new PageTester($page, $params, $panel);
    }
}
