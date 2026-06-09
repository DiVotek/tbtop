<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class PlaygroundPage extends Page
{
    public static function path(): string
    {
        return 'playground';
    }

    public function title(): string
    {
        return 'Walking Skeleton';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->heading('Form round-trip', 2),
            $s->form('profile', [
                $s->text('name')->label('Name')->required()->rules('max:50'),
                $s->text('email')->label('Email')->required()->rules('email'),
                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')->submit(),
                ]),
            ])
                ->record(['name' => 'Ada', 'email' => 'ada@example.com'])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                    ->notify("Saved {$ctx->form['name']}")),
            $s->divider(),
            $s->heading('Server action', 2),
            $s->actionsRow([
                $s->action('ping')->label('Ping server')->handle(
                    fn (ActionCtx $ctx): Effects => Effects::make()->notify('Pong', 'info'),
                ),
                $s->action('boom')->label('Dangerous')->color('danger')
                    ->confirm('Really?', 'This is the confirm-modal path.')
                    ->handle(fn (): Effects => Effects::make()->notify('Boom confirmed', 'warning')),
            ]),
        ]);
    }
}
