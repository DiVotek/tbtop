<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Showcase for the fluent validation helpers (->minLength, ->between, ->unique,
 * etc.). The framework auto-validates collectRules() on submit, so bad input is
 * rejected server-side; min/max also pre-flight on blur (wire constraints).
 * Save with valid input to echo the values back via a notify.
 */
class ValidationRulesPage extends Page
{
    public static function path(): string
    {
        return 'validation-rules';
    }

    public function title(): string
    {
        return 'Fluent validation helpers';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Fluent validation — try invalid input and Save to see server rejection')
                ->variant('subheading'),

            $s->form('validated', [
                $s->text('username')
                    ->label('Username (3–20 chars, alphanumeric)')
                    ->required()
                    ->minLength(3)
                    ->maxLength(20)
                    ->alphaNum(),

                $s->text('slug')
                    ->label('Slug (regex: lowercase + dashes)')
                    ->required()
                    ->regex('/^[a-z0-9-]+$/'),

                $s->number('age')
                    ->label('Age (between 18 and 99)')
                    ->required()
                    ->between(18, 99),

                $s->password('password')
                    ->label('Password (min 8 chars, must be confirmed)')
                    ->required()
                    ->minLength(8)
                    ->confirmed(),

                $s->password('password_confirmation')
                    ->label('Confirm password'),

                $s->otp('code')
                    ->label('OTP (6 digits — length drives both UI and validation)')
                    ->length(6)
                    ->required(),

                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')->submit(),
                ]),
            ])
                ->record([
                    'username' => 'jane99',
                    'slug' => 'hello-world',
                    'age' => 30,
                    'password' => '',
                    'password_confirmation' => '',
                    'code' => '',
                ])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                    ->notify($this->echo($ctx->form))),
        ]);
    }

    /** Build a readable summary of the validated field values. */
    private function echo(array $form): string
    {
        return "Valid! username={$form['username']} slug={$form['slug']} "
            ."age={$form['age']} code={$form['code']}";
    }
}
