<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * McpHttpTest: an opted-out, ungated sibling under McpRecordPage's path — only
 * the route guards stand between it and a param like "7/secret".
 */
class McpRecordSecretPage extends Page
{
    public static function path(): string
    {
        return 'mcp-records/{record}/secret';
    }

    public static function mcp(): bool
    {
        return false;
    }

    public function view(S $s): Node
    {
        McpPage::$ran['secret-view'] = true;

        return $s->stack([
            $s->action('archive')->handle(function (): Effects {
                McpPage::$ran['secret-archive'] = true;

                return Effects::make();
            }),
        ]);
    }
}
