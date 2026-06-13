<?php

namespace App\Admin\Pages;

use App\Models\User;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Showcases the server-driven async relation field: type-ahead search over
 * users by name, resolved through the relation-search endpoint. Kept on its
 * own page so the post form's select-with-create author demo stays intact.
 */
class RelationDemoPage extends Page
{
    public static function path(): string
    {
        return 'relation-demo';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Relation field demo', 'order' => 98];
    }

    public function title(): string
    {
        return 'Relation field demo';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Async relation field')->variant('heading'),
            $s->form('relationDemo', [
                $s->relation('author_id')->label('Author')
                    ->query(fn () => User::query()->orderBy('name'))
                    ->labelKey('name')
                    ->searchable()
                    ->rules('nullable|exists:users,id'),
                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')->submit(),
                ]),
            ])
                ->record(['author_id' => null])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                    ->notify('Selected author id: '.((string) ($ctx->form['author_id'] ?? '—')))),
        ]);
    }
}
