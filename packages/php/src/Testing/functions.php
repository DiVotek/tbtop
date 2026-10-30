<?php

use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Testing\PageTester;

if (! function_exists('tbtop')) {
    /**
     * Visit an admin page as the current actingAs() user — the entry point of
     * the testing API. Loaded with the package; it only runs inside a test.
     *
     * @param  class-string<Page>  $page
     * @param  array<string, mixed>  $params  route parameters of the page's path()
     */
    function tbtop(string $page, array $params = [], ?string $panel = null): PageTester
    {
        return new PageTester($page, $params, $panel);
    }
}
