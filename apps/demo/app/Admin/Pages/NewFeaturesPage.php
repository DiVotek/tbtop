<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Showcase for the field kinds added in M-89 (CheckboxList, ToggleButtons,
 * Slider). Submitting the form echoes the captured values back via a notify,
 * so each new control can be verified end to end (render → edit → wire → PHP).
 */
class NewFeaturesPage extends Page
{
    public static function path(): string
    {
        return 'new-features';
    }

    public function title(): string
    {
        return 'New field kinds (M-89)';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('New field kinds — interact and Save to echo the values')
                ->variant('subheading'),

            $s->form('newFields', [
                // CheckboxList — array value from a fixed option set.
                $s->checkboxlist('channels')
                    ->label('Notification channels (CheckboxList)')
                    ->options([
                        ['value' => 'email', 'label' => 'Email'],
                        ['value' => 'sms', 'label' => 'SMS'],
                        ['value' => 'push', 'label' => 'Push'],
                    ])
                    ->required()
                    ->rules('array'),

                // ToggleButtons (single) — scalar value, segmented buttons.
                $s->togglebuttons('plan')
                    ->label('Plan (ToggleButtons, single)')
                    ->options([
                        ['value' => 'free', 'label' => 'Free'],
                        ['value' => 'pro', 'label' => 'Pro'],
                        ['value' => 'team', 'label' => 'Team'],
                    ])
                    ->required(),

                // ToggleButtons (multiple) — array value.
                $s->togglebuttons('tags')
                    ->label('Tags (ToggleButtons, multiple)')
                    ->multiple()
                    ->options([
                        ['value' => 'new', 'label' => 'New'],
                        ['value' => 'sale', 'label' => 'Sale'],
                        ['value' => 'hot', 'label' => 'Hot'],
                    ]),

                // Slider — numeric value with min/max/step.
                $s->slider('volume')
                    ->label('Volume (Slider)')
                    ->min(0)
                    ->max(100)
                    ->step(5)
                    ->rules('min:0|max:100'),

                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')->submit(),
                ]),
            ])
                ->record([
                    'channels' => ['email'],
                    'plan' => 'pro',
                    'tags' => ['new'],
                    'volume' => 40,
                ])
                ->onSubmit(fn (ActionCtx $ctx): Effects => Effects::make()
                    ->notify($this->echo($ctx->form))),
        ]);
    }

    /** Build a readable summary of the submitted field values. */
    private function echo(array $form): string
    {
        $channels = implode(', ', $form['channels'] ?? []);
        $tags = implode(', ', $form['tags'] ?? []);

        return "channels=[{$channels}] plan={$form['plan']} "
            ."tags=[{$tags}] volume={$form['volume']}";
    }
}
