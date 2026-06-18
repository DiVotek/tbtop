<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Minimal page exercising a modal action's backend data query endpoint.
 */
class ActionDataPage extends Page
{
    /** @var array<string, mixed>|null Row payload the query closure received. */
    public static ?array $capturedRow = null;

    public static function path(): string
    {
        return 'action-data';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->action('editPublication')
                ->label('Edit publication')
                ->modal('Edit publication', $s->displayText('body')->variant('muted'))
                ->query(function (ActionCtx $ctx): array {
                    static::$capturedRow = $ctx->row;

                    return [
                        'id' => $ctx->row['id'] ?? null,
                        'published' => true,
                    ];
                }, needs: ['row']),
            // A plain action with no query — its data endpoint must 404.
            $s->action('noQuery')->label('No query')->visit('/x'),
        ]);
    }
}
