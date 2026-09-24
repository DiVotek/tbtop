<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** McpHttpTest: a parameterised page, listed by search() only once given its params. */
class McpRecordPage extends Page
{
    public static function path(): string
    {
        return 'mcp-records/{record}';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->action('archive')->handle(fn (): Effects => Effects::make()),
        ]);
    }
}
