<?php

namespace Tbtop\Admin\Tests\Fixtures\Chromes;

use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\Chrome;

/** Appends a dropdown-variant locale switcher, exercising its options contract. */
class LocaleSwitcherChrome extends Chrome
{
    protected function headerItems(S $s): array
    {
        return [
            ...parent::headerItems($s),
            $s->localeSwitcher('dropdown'),
        ];
    }
}
