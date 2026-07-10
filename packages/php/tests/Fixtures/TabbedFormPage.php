<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Regression fixture: a required field and a translatable field live inside
 * an S::tabs() body. RuleWalker/TranslatableRecord must recurse into
 * options['tabs'][*]['body'] or these fields silently vanish from both
 * validation and $ctx->form on submit.
 */
class TabbedFormPage extends Page
{
    /** @var array<string, mixed>|null Captured submit payload for assertions. */
    public static ?array $submitted = null;

    public static function path(): string
    {
        return 'tabbed-form';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Tabbed form')->variant('heading'),
            $s->form('post', [
                $s->tabs([
                    [
                        'label' => 'Main',
                        'body' => $s->stack([
                            $s->text('title')->label('Title')->required()->rules('max:200'),
                            $s->text('summary')->label('Summary')->translatable(),
                        ]),
                    ],
                    [
                        'label' => 'Extra',
                        'body' => $s->displayText('Nothing else to see here.'),
                    ],
                ]),
            ])
                ->record(['title' => 'Hello', 'summary' => 'Hi'])
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    static::$submitted = $ctx->form;

                    return Effects::make()->notify('Saved');
                }),
        ]);
    }
}
