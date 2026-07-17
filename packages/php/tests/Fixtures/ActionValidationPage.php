<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Minimal page exercising the action-endpoint validation-error contract
 * (audit 5.20): an uncaught ValidationException from a server action
 * handler, a handler that catches it and halts the modal instead, and a
 * normal Effects response — all on the same endpoint shape.
 */
class ActionValidationPage extends Page
{
    public static function path(): string
    {
        return 'action-validation';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->action('throwsUncaught')->handle(function (ActionCtx $ctx): Effects {
                Validator::make($ctx->form, [
                    'title' => 'required|string',
                    'email' => 'required|email',
                ])->validate();

                return Effects::make()->notify('unreachable');
            }, needs: ['form']),
            $s->action('haltsInstead')->handle(function (ActionCtx $ctx): Effects {
                try {
                    Validator::make($ctx->form, ['title' => 'required|string'])->validate();
                } catch (ValidationException $e) {
                    return Effects::make()->haltModal($e->validator->errors()->first());
                }

                return Effects::make()->notify('unreachable');
            }, needs: ['form']),
            $s->action('succeeds')->handle(
                fn (): Effects => Effects::make()->notify('Saved')->closeModal(),
                needs: ['form'],
            ),
        ]);
    }
}
