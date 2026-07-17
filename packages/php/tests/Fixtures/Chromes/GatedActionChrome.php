<?php

namespace Tbtop\Admin\Tests\Fixtures\Chromes;

use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\Chrome;

/** A gated header action alongside an ungated one — exercises chrome-level authorize filtering. */
class GatedActionChrome extends Chrome
{
    protected function headerItems(S $s): array
    {
        return [
            ...parent::headerItems($s),
            $s->action('inbox')->label('Inbox')->visit('/admin/form-submissions')->authorize('chrome-gated-inbox'),
            $s->action('view-site')->label('View site')->visit('/'),
        ];
    }
}
