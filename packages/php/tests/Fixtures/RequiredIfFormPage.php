<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Regression fixture: Field::requiredIf() must both compile into a live
 * client-side asterisk (meta.requiredIf) and enforce the same condition
 * server-side via a derived Laravel rule.
 */
class RequiredIfFormPage extends Page
{
    /** @var array<string, mixed>|null Captured submit payload for assertions. */
    public static ?array $submitted = null;

    public static function path(): string
    {
        return 'required-if-form';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Required-if form')->variant('heading'),
            $s->form('post', [
                $s->text('type')->label('Type'),
                $s->text('company_name')->label('Company name')
                    ->requiredIf('type', '=', 'company'),
                $s->boolean('published'),
                $s->text('publish_note')->label('Publish note')
                    ->requiredIf('published', '=', true),
            ])
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    static::$submitted = $ctx->form;

                    return Effects::make()->notify('Saved');
                }),
        ]);
    }
}
