<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Fields\Embed;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class RichtextEmbedsPage extends Page
{
    /** @var array<string, mixed>|null Captured submit payload for assertions. */
    public static ?array $submitted = null;

    public static function path(): string
    {
        return 'richtext-embeds';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('doc', [
                $s->richtext('body')->embeds([self::callout($s)]),
                $s->richtext('intro')->translatable()->embeds([self::callout($s)]),
            ])->onSubmit(function (ActionCtx $ctx): Effects {
                static::$submitted = $ctx->form;

                return Effects::make()->notify('Saved');
            }),
        ]);
    }

    private static function callout(S $s): Embed
    {
        return Embed::make('callout')
            ->label('Callout')
            ->summary('title')
            ->fields([$s->text('title')->label('Title')->required(), $s->textarea('text')]);
    }
}
