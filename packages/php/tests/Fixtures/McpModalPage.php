<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Actions\CreateAction;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** McpModalTest: forms that live in modals — a table's CreateAction and a page-level modal action. */
class McpModalPage extends Page
{
    /** @var array<string, mixed> */
    public static array $ran = [];

    public static function path(): string
    {
        return 'mcp-modal';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->actionsRow([
                $s->action('invite')->label('Invite')->modal('Invite', $s->form('inviteForm', [
                    $s->text('email')->label('Email')->helperText('Work address')->required()->rules('email'),
                    $s->actionsRow([
                        $s->action('inviteSend')->label('Send')->handle(function (ActionCtx $ctx): Effects {
                            static::$ran['inviteSend'] = $ctx->form;

                            return Effects::make()->closeModal();
                        }, needs: ['form']),
                    ]),
                ])),
            ]),
            $s->table('items')
                ->headerActions([
                    CreateAction::make(
                        $s,
                        form: $s->form('createItem', [$s->text('name')->label('Name')->required()]),
                        storeUsing: function (ActionCtx $ctx): Effects {
                            static::$ran['createStore'] = $ctx->form;

                            return Effects::make()->notify('Created');
                        },
                        defaultRecord: ['name' => 'Draft'],
                    )->slideOver(),
                ])
                ->columns([Column::make('name')->label('Name')])
                ->query(fn () => DB::table('items'))
                ->toNode(),
        ]);
    }
}
