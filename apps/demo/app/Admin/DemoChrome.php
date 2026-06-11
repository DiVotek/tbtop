<?php

namespace App\Admin;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\Chrome;

/**
 * Demo chrome: the stock shell plus a visit-action button in the header
 * and a footer note — the reference "spread defaults + append" pattern.
 */
class DemoChrome extends Chrome
{
    protected function headerItems(S $s): array
    {
        return [
            ...parent::headerItems($s),
            $s->action('view-site')->label('View site')->visit('/'),
        ];
    }

    public function footer(S $s): ?Node
    {
        return $s->row([
            $s->displayText('Tabletop demo — shell authored by DemoChrome')->variant('muted'),
        ]);
    }
}
