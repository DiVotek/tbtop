<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\LayoutBuilder;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class PostEditPage extends Page
{
    /** @var array<string, mixed>|null Captured submit payload for assertions. */
    public static ?array $submitted = null;

    public static function path(): string
    {
        return 'posts/{post}/edit';
    }

    public function view(S $s): Node|LayoutBuilder
    {
        return $s->stack([
            $s->displayText('Edit post')->variant('heading'),
            $s->form('post', [
                $s->text('title')->label('Title')->required()->rules('max:200'),
                $s->repeater('sections')->set('fields', [
                    $s->text('heading')->required(),
                    $s->textarea('body'),
                ]),
            ])
                ->record(['title' => 'Hello', 'sections' => []])
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    static::$submitted = $ctx->form;

                    return Effects::make()->notify('Saved');
                }),
            $s->action('publish')
                ->label('Publish')
                ->confirm('Publish this post?')
                ->handle(
                    fn (ActionCtx $ctx): Effects => Effects::make()
                        ->notify("Published {$ctx->row['id']}")
                        ->refreshTable(),
                    needs: ['row'],
                ),
            $s->action('open-list')->label('Back')->visit('/admin/posts'),
        ]);
    }
}
