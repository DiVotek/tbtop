<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** McpHttpTest: a gated page with every executable kind the MCP server lists or hides. */
class McpPage extends Page
{
    /** @var array<string, mixed> Handler name => the ctx part it received. */
    public static array $ran = [];

    public static function path(): string
    {
        return 'mcp-page';
    }

    public static function can(): ?string
    {
        return 'view-mcp-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->text('name')->label('Name')->required(),
                $s->action('save')->handle(function (ActionCtx $ctx): Effects {
                    static::$ran['save'] = $ctx->form;

                    return Effects::make()->notify('Saved');
                }, needs: ['form']),
            ])->onSubmit(function (ActionCtx $ctx): Effects {
                static::$ran['main'] = $ctx->form;

                return Effects::make()->notify('Submitted');
            }),
            $s->action('ping')->handle(function (): Effects {
                static::$ran['ping'] = true;

                return Effects::make()->notify('pong');
            }),
            $s->action('hidden')->mcp(false)->handle(fn (): Effects => Effects::make()),
            $s->action('clientOnly')->custom('openWidget'),
            $s->table('items')
                ->columns([Column::make('name')->label('Name')->formatUsing(fn (string $v): string => strtoupper($v))])
                ->rowActions([
                    $s->action('rename')->handle(function (ActionCtx $ctx): Effects {
                        static::$ran['rename'] = $ctx->row;

                        return Effects::make();
                    }, needs: ['row']),
                ])
                ->query(fn () => DB::table('items'))
                ->toNode(),
        ]);
    }
}
