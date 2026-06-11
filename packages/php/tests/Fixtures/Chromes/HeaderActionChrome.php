<?php

namespace Tbtop\Admin\Tests\Fixtures\Chromes;

use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\Chrome;

/** The documented consumer pattern: spread the defaults, append a block. */
class HeaderActionChrome extends Chrome
{
    protected function headerItems(S $s): array
    {
        return [
            ...parent::headerItems($s),
            $s->action('view-site')->label('View site')->visit('/'),
        ];
    }
}
