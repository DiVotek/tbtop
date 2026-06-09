<?php

namespace App\Admin\Pages;

use App\Models\Media;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class MediaEditPage extends Page
{
    public static function path(): string
    {
        return 'media/{media}/edit';
    }

    public function title(): string
    {
        return 'Edit media';
    }

    public function view(S $s): Node
    {
        $media = Media::findOrFail(request()->route('media'));

        return $s->stack([
            $s->form('media', [
                $s->section(['title' => 'Details'], [
                    $s->text('alt')->label('Alt text')->rules('nullable|max:500'),
                ]),
                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')
                        ->keybinding('mod+s')->submit(),
                    $s->action('cancel')->label('Cancel')->visit('/admin/media'),
                ]),
            ])
                ->record($media->toArray())
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    Media::findOrFail($ctx->params['media'] ?? null)
                        ->update(['alt' => $ctx->form['alt'] ?? null]);

                    return Effects::make()->notify('Saved');
                }),
        ]);
    }
}
