<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * A form whose actions sit inside it, so the form's rules apply: one action
 * gated the normal way, one opted out via ->withoutValidation().
 */
class ActionSkipValidationPage extends Page
{
    /** @var array<string, mixed>|null Form payload the last handler received. */
    public static ?array $capturedForm = null;

    public static function path(): string
    {
        return 'action-skip-validation';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('post', [
                $s->text('title')->required(),
                $s->text('note'),
                $s->password('password')->nullable()->same('password_confirmation'),
                $s->password('password_confirmation')->nullable(),
                $s->repeater('items')->set('fields', [
                    $s->text('name')->required(),
                ]),
                $s->action('addBlock')
                    ->handle($this->capture(...), needs: ['form'])
                    ->withoutValidation(),
                $s->action('save')->handle($this->capture(...), needs: ['form']),
                // A table inside the form: its row action inherits the form the
                // client already hands it, so the same rules must reach it here.
                $s->table('rows')
                    ->rowActions([
                        $s->action('rowSave')->handle($this->capture(...), needs: ['form']),
                    ])
                    ->query(fn () => null)
                    ->toNode(),
            ]),
        ]);
    }

    private function capture(ActionCtx $ctx): Effects
    {
        static::$capturedForm = $ctx->form;

        return Effects::make()->notify('Ran');
    }
}
