<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Exercises Page::headerActions(): a visit action (always visible), a
 * gate-authorized action (hidden unless the gate passes), and a server
 * action rendered right of the title/subtitle block.
 */
class HeaderActionsPage extends Page
{
    /** @var bool Set true when the server-handled header action runs. */
    public static bool $refreshed = false;

    public static function path(): string
    {
        return 'header-actions';
    }

    public function subtitle(): ?string
    {
        return 'Subtitle line';
    }

    /** @return list<ActionBuilder|Node> */
    public function headerActions(S $s): array
    {
        Gate::define('header-actions-export', fn (?object $user): bool => false);

        return [
            $s->action('create')->label('New item')->visit('/admin/header-actions/create'),
            $s->action('export')->label('Export')->authorize('header-actions-export')->visit('/admin/header-actions/export'),
            $s->action('refresh')->label('Refresh')->handle(function (ActionCtx $ctx): Effects {
                static::$refreshed = true;

                return Effects::make()->notify('Refreshed');
            }),
        ];
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Header actions fixture')->variant('heading'),
        ]);
    }
}
