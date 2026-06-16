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
            $s->displayText('Form round-trip')->variant('subheading'),
            $s->form('profile', [
                $s->text('name')->label('Name')->required()->rules('max:50'),
                $s->text('email')->label('Email')->required()->rules('email'),
                $s->select('roles')->label('Roles')->multiple()->options([
                    ['value' => 'admin', 'label' => 'Admin'],
                    ['value' => 'editor', 'label' => 'Editor'],
                    ['value' => 'viewer', 'label' => 'Viewer'],
                ])->rules('in:admin,editor,viewer')->creatable(
                    [$s->text('label')->label('Role name')->required()],
                    fn (array $v): array => ['value' => strtolower($v['label']), 'label' => $v['label']],
                ),
                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')->submit(),
                ]),
            ])
                ->record(['name' => 'Ada', 'email' => 'ada@example.com', 'roles' => ['admin']])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                    ->notify("Saved {$ctx->form['name']}")),
            $s->displayDivider(),
            $s->displayText('Server action')->variant('subheading'),
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
