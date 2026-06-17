<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * Fixture for MiddlewareOverrideHttpTest: a public page that overrides the
 * panel's auth stack down to ['web'], so it (and its form endpoint) is reachable
 * unauthenticated.
 */
class PublicLoginPage extends Page
{
    /** @var array<string, mixed>|null Captured form payload for assertions. */
    public static ?array $submitted = null;

    public static function path(): string
    {
        return 'public-login';
    }

    public static function middleware(PanelConfig $panel): ?array
    {
        return ['web'];
    }

    public function layout(): string
    {
        return 'center';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('login', [
                $s->text('email')->label('Email')->required(),
                $s->password('password')->label('Password')->required(),
            ])->onSubmit(function (ActionCtx $ctx): string {
                static::$submitted = $ctx->form;

                return '/done';
            }),
        ]);
    }
}
