<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Actions\EditAction;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Fields\Embed;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Upload values the page-form binding of UploadBindingPage does not reach on
 * its own: a row edit modal (record loaded by its query()), an Upload inside a
 * richtext embed, and one inside a translatable repeater.
 */
class UploadBindingNestedPage extends Page
{
    /** Each row's stored file, as the edit modal's query() loads it. */
    public const ROW_FILES = [1 => 'docs/one.pdf', 2 => 'docs/two.pdf'];

    /** @var list<array<string, mixed>> */
    public static array $saved = [];

    public static function path(): string
    {
        return 'upload-binding-nested';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('docs')
                ->columns([Column::make('title')])
                ->query(fn () => CaPost::query())
                ->rowActions([
                    EditAction::make(
                        $s,
                        form: $s->form('editDoc', [
                            $s->upload('file')->disk('public')->directory('docs'),
                        ]),
                        loadUsing: fn (ActionCtx $ctx): array => ['file' => self::ROW_FILES[$ctx->key()] ?? null],
                        saveUsing: function (ActionCtx $ctx): void {
                            self::$saved[] = $ctx->form;
                        },
                    ),
                ]),
            $s->form('article', [
                $s->richtext('body')->embeds([
                    Embed::make('figure')->fields([$s->upload('figureImage')->disk('public')->directory('figures')]),
                ]),
                $s->repeater('slides')->translatable()->fields([
                    $s->upload('slideImage')->disk('public')->directory('slides'),
                ]),
            ])->record([
                'body' => self::figureDocument('figures/current.png'),
                'slides' => [['slideImage' => ['en' => 'slides/current-en.png', 'uk' => null]]],
            ])->onSubmit(function (ActionCtx $ctx): null {
                self::$saved[] = $ctx->form;

                return null;
            }),
        ]);
    }

    /** @return array<string, mixed> */
    public static function figureDocument(string $path): array
    {
        return ['root' => [
            'type' => 'root', 'version' => 1, 'direction' => null, 'format' => '', 'indent' => 0,
            'children' => [
                ['type' => 'embed', 'version' => 1, 'id' => '0b5e6a1c-6f0d-4a52-9f1e-3c2d7a8b9e10', 'kind' => 'figure', 'data' => ['figureImage' => $path]],
            ],
        ]];
    }
}
