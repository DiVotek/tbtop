<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Demo page rendered with the center layout — a chrome-less, full-viewport
 * shell centered both horizontally and vertically. Use it to manually verify
 * that the 'center' layout value produces no sidebar, header, or footer.
 *
 * Auth pages (login/register) will use this layout once implemented.
 */
class LoginPreviewPage extends Page
{
    public static function path(): string
    {
        return 'layout-preview/center';
    }

    public function layout(): string
    {
        return 'center';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Center layout preview', 'order' => 99, 'icon' => 'eye'];
    }

    public function title(): string
    {
        return 'Center layout preview';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Center Layout')->variant('heading'),
            $s->displayText(
                'This page uses layout: center — no sidebar, header, or footer. '
                .'Auth pages (login/register) will use this shell once they are implemented.'
            )->variant('muted'),
            $s->displayAlert('You are seeing the center layout.')
                ->title('Center layout active')
                ->color(Color::Info),
            $s->form('demo', [
                $s->text('email')->label('Email')->required(),
                $s->password('password')->label('Password')->required(),
                $s->actionsRow([
                    $s->action('submit')->label('Submit demo form')->color('primary')->submit(),
                ]),
            ])
                ->record(['email' => ''])
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    return Effects::make()->notify('Form submitted: '.$ctx->form['email']);
                }),
        ]);
    }
}
