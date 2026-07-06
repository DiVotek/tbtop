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
            $s->displayText('Copyable & input masks')->variant('subheading'),
            $s->form('contact', [
                $s->text('phone')->label('Phone')
                    ->mask('(999) 999-9999')
                    ->required()->rules('size:14')
                    ->helperText('Masked as you type; must be a full number.'),
                $s->text('card')->label('Card number')
                    ->mask('9999 9999 9999 9999')
                    ->helperText('Digits group into blocks of four.'),
                $s->text('api_token')->label('API token')
                    ->copyable(copyMessage: 'Token copied!', copyMessageDuration: 1500)
                    ->helperText('Use the copy icon to grab the token.'),
                $s->actionsRow([
                    $s->action('save_contact')->label('Save')->color('primary')->submit(),
                ]),
            ])
                ->record(['api_token' => 'sk_live_5f3a9c2e8b7d41', 'phone' => '', 'card' => ''])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                    ->notify("Phone saved: {$ctx->form['phone']}")),
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
            $s->displayDivider(),
            $s->displayText('Form layout: grid breakpoints, section, radio')->variant('subheading'),
            $s->form('preferences', [
                $s->section([
                    'title' => 'Notifications',
                    'description' => 'Choose how you want to hear from us.',
                    'icon' => 'globe',
                    'columns' => ['sm' => 1, 'md' => 2],
                ], [
                    $s->radio('frequency')->label('Email frequency')->options([
                        ['value' => 'realtime', 'label' => 'Real-time', 'description' => 'Send every event as it happens.'],
                        ['value' => 'daily', 'label' => 'Daily digest', 'description' => 'One summary email per day.'],
                        ['value' => 'off', 'label' => 'Off', 'description' => 'Never email me.'],
                    ])->rules('in:realtime,daily,off'),
                    $s->radio('channel')->label('Preferred channel')->inline()->options([
                        ['value' => 'email', 'label' => 'Email'],
                        ['value' => 'sms', 'label' => 'SMS'],
                    ])->rules('in:email,sms'),
                    $s->text('digest_subject')->label('Digest subject line')
                        ->helperText('Spans both columns on md+ screens.')
                        ->columnSpan(['md' => 2])
                        ->rules('nullable|max:120'),
                ]),
                $s->section([
                    'title' => 'Advanced',
                    'description' => 'Rarely-needed settings, collapsed by default.',
                    'icon' => 'lock',
                    'collapsible' => true,
                    'collapsed' => true,
                ], [
                    $s->boolean('beta_features')->label('Enable beta features')->rules('boolean'),
                ]),
                $s->actionsRow([
                    $s->action('save_preferences')->label('Save')->color('primary')->submit(),
                ]),
            ])
                ->record(['frequency' => 'daily', 'channel' => 'email', 'digest_subject' => '', 'beta_features' => false])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                    ->notify("Preferences saved: {$ctx->form['frequency']}")),
        ]);
    }
}
