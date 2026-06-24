<?php

namespace Tbtop\Admin\Tests\Fixtures\Panels;

/** No pages — exercises the notifications endpoints in the chrome cluster. */
class NotificationsPanel extends TestPanel
{
    protected function pages(): array
    {
        return [];
    }
}
