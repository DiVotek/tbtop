<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Closure;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * McpHttpTest: executables and tables at the edges the MCP server refuses —
 * several needs, required excluded fields, tables with limited arguments and
 * handlers that throw. Handlers record into McpPage::$ran.
 */
class McpEdgesPage extends Page
{
    public static function path(): string
    {
        return 'mcp-edges';
    }

    public static function can(): ?string
    {
        return 'view-mcp-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('edit', [
                $s->text('title'),
                $s->action('saveRow')->handle(self::records('saveRow'), needs: ['row', 'form']),
            ]),
            $s->form('photo', [$s->text('caption'), $s->upload('file')->required()])->onSubmit(self::records('photo')),
            $s->form('gallery', [$s->text('heading'), $s->upload('images')->multiple()->required()])->onSubmit(self::records('gallery')),
            $s->form('article', [$s->upload('cover')->required(), $s->upload('banner')->required(), $s->text('note')])
                ->onSubmit(self::records('article')),
            $s->form('retouch', [$s->text('alt'), $s->upload('original')->required()->rules('sometimes')])->onSubmit(self::records('retouch')),
            $s->form('draft', [
                $s->text('remark'),
                $s->upload('scan')->required(),
                $s->action('saveDraft')->withoutValidation()->handle(self::records('saveDraft'), needs: ['form']),
                $s->action('submitDraft')->handle(self::records('submitDraft'), needs: ['form']),
            ]),
            $s->action('explode')->handle(fn () => throw new RuntimeException('secret')),
            $s->action('abort500')->handle(fn () => abort(500, 'secret')),
            $s->action('abort409')->handle(fn () => abort(409, 'Already archived.')),
            $s->table('catalog')
                ->columns([Column::make('id'), Column::make('name')->sortable()->individuallySearchable()])
                ->searchable(['name'])
                ->filters([$s->text('name')])
                ->defaultSort('id', 'desc')
                ->paginate(5, [10, 20])
                ->query(fn () => DB::table('items'))
                ->toNode(),
            $s->table('plain')
                ->columns([Column::make('name')])
                ->query(fn () => DB::table('items'))
                ->toNode(),
        ]);
    }

    /** A handler that records it ran, with the form it received. */
    private static function records(string $name): Closure
    {
        return static function (ActionCtx $ctx) use ($name): Effects {
            McpPage::$ran[$name] = $ctx->form;

            return Effects::make();
        };
    }
}
