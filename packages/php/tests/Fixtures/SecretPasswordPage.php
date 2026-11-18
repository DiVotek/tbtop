<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** Password::secret() over a stored record: preview, clearable, required, nothing stored. */
class SecretPasswordPage extends Page
{
    /** @var array<string, mixed>|null */
    public static ?array $submitted = null;

    /** @var array<string, mixed>|null */
    public static ?array $actionForm = null;

    public static function path(): string
    {
        return 'secret-password';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('settings', [
                $s->text('name'),
                $s->section(['title' => 'Keys'], [
                    $s->password('api_key')->preview(fn (string $v): string => '…'.substr($v, -4))->required(),
                    $s->password('webhook')->clearable(),
                ]),
                $s->password('pin')->secret()->minLength(4),
                $s->password('fresh')->secret()->required(),
                $s->password('token')->clearable()->required(),
                $s->action('rotate')->handle(function (ActionCtx $ctx): Effects {
                    static::$actionForm = $ctx->form;

                    return Effects::make();
                }, needs: ['form']),
            ])
                ->record(['name' => 'Acme', 'api_key' => 'sk_live_abcd4242', 'webhook' => 'whsec_1', 'pin' => '1234', 'token' => 'tok_1'])
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    static::$submitted = $ctx->form;

                    return Effects::make();
                }),
        ]);
    }
}
