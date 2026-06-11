<?php

namespace Tbtop\Admin\Tests\Fixtures\Chromes;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\Chrome;

class FooterChrome extends Chrome
{
    public function footer(S $s): ?Node
    {
        return $s->row([$s->displayText('Footer note')->variant('muted')]);
    }
}
