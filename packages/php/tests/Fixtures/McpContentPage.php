<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Fields\Embed;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * McpContentTest: richtext documents at the top level and inside repeater rows, and an
 * upload inside a row whose stored value an agent may echo but not change, and a secret()
 * password an agent cannot wipe by sending null.
 */
class McpContentPage extends Page
{
    public static function path(): string
    {
        return 'mcp-content';
    }

    public static function can(): ?string
    {
        return 'view-mcp-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('post', [
                $s->richtext('body')->translatable()->embeds([
                    Embed::make('pullQuote')->label('Pull quote')->fields([$s->text('author')->required()]),
                ]),
                $s->repeater('sections')->fields([$s->text('heading'), $s->media('image'), $s->richtext('content')]),
                $s->password('token')->secret(),
            ])
                ->record(['sections' => [['heading' => 'Intro', 'image' => 'intro.png', 'content' => null]], 'token' => 'tok_stored'])
                ->onSubmit(static function (ActionCtx $ctx): Effects {
                    McpPage::$ran['post'] = $ctx->form;

                    return Effects::make();
                }),
        ]);
    }
}
