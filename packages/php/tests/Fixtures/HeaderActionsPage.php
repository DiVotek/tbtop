<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Exercises Page::headerActions(): a visit action (always visible) and a
 * gate-authorized action (hidden unless the gate passes) rendered right of
 * the title/subtitle block.
 */
class HeaderActionsPage extends Page
{
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
        ];
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Header actions fixture')->variant('heading'),
        ]);
    }
}
