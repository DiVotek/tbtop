<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

/** No pages — exercises the media/upload/locale endpoints only. */
class MediaPanel extends TestPanel
{
    protected function pages(): array
    {
        return [];
    }
}
