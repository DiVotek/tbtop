<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

use Tbtop\Admin\Tests\MakeResourceHttpTestCase;

/** Serves the pages make:tbtop-resource generated during the test run. */
class ResourcePanel extends TestPanel
{
    protected function pages(): array
    {
        return MakeResourceHttpTestCase::$pages;
    }
}
