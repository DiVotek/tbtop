<?php

namespace App\Admin\Pages;

use App\Models\Media;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Actions\FormActions;
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
                $s->section(['title' => 'Image'], [
                    $s->upload('file')->label('Image')->required()
                        ->disk('public')->directory('uploads')->accept('image/*'),
                ]),
                $s->section(['title' => 'Details'], [
                    $s->text('alt')->label('Alt text')->rules('nullable|max:500'),
                ]),
                FormActions::saveCancel($s, '/admin/media'),
            ])
                ->record([
                    ...$media->toArray(),
                    'file' => $media->path,
                ])
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    $media = Media::findOrFail($ctx->params['media'] ?? null);
                    $updates = ['alt' => $ctx->form['alt'] ?? null];
                    $path = $ctx->form['file'] ?? null;
                    if (is_string($path) && $path !== $media->path) {
                        $updates = [...$updates, ...Media::metadataFromPath($path)];
                    }
                    $media->update($updates);

                    return Effects::make()->notify('Saved');
                }),
        ]);
    }
}
