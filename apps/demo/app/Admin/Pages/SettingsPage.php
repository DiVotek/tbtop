<?php

namespace App\Admin\Pages;

use App\Models\Setting;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class SettingsPage extends Page
{
    public static function path(): string
    {
        return 'settings';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Site settings', 'order' => 1];
    }

    public function title(): string
    {
        return 'Site settings';
    }

    public function view(S $s): Node
    {
        $settings = Setting::firstOrCreate([]);

        return $s->stack([
            $s->displayText('Site Settings')->variant('heading'),
            $s->displayText('Manage your site configuration below.')->variant('muted'),
            $s->displayAlert('Changes are applied immediately after saving.')
                ->title('Heads up')
                ->color(Color::Info),
            $s->displayDivider(),
            $s->displayHtml('<p>For help, visit <a href="https://example.com/docs" target="_blank">the docs</a>.</p>'),
            $s->form('settings', [
                $s->section(['title' => 'Site'], [
                    $s->text('site_name')->label('Site name')->required()->rules('max:200'),
                    $s->text('tagline')->label('Tagline'),
                ]),
                $s->section(['title' => 'Operations'], [
                    $s->boolean('maintenance_mode')->label('Maintenance mode')->rules('boolean'),
                    $s->number('max_upload_mb')->label('Max upload (MB)')
                        ->set('min', 0)->set('step', 1)
                        ->required()->rules('integer|min:0'),
                    $s->date('launch_date')->label('Launch date')->rules('nullable|date'),
                ]),
                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')
                        ->keybinding('mod+s')->submit(),
                ]),
            ])
                ->record($settings->toArray())
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    Setting::firstOrCreate([])->update($ctx->form);

                    return Effects::make()->notify('Saved');
                }),
        ]);
    }
}
