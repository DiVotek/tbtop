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
                $s->section(['title' => 'Image'], [
                    $s->upload('file')->label('Image')->required()
                        ->set('entity', 'media')
                        ->set('accept', 'image/*'),
                ]),
                $s->section(['title' => 'Details'], [
                    $s->text('alt')->label('Alt text')->rules('nullable|max:500'),
                ]),
                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')
                        ->keybinding('mod+s')->submit(),
                    $s->action('cancel')->label('Cancel')->visit('/admin/media'),
                ]),
            ])
                ->record([
                    ...$media->toArray(),
                    'file' => ['filename' => $media->filename, 'url' => $media->url],
                ])
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    $media = Media::findOrFail($ctx->params['media'] ?? null);
                    $media->update([
                        'alt' => $ctx->form['alt'] ?? null,
                        ...self::fileColumns($ctx->form['file'] ?? null, $media),
                    ]);

                    return Effects::make()->notify('Saved');
                }),
        ]);
    }

    /**
     * A fresh upload carries a new url; the record-prefilled value
     * keeps the current one, so same url means "image untouched".
     *
     * @return array<string, mixed>
     */
    private static function fileColumns(mixed $file, Media $media): array
    {
        if (! is_array($file) || ($file['url'] ?? null) === $media->url) {
            return [];
        }

        return [
            'filename' => $file['filename'] ?? '',
            'url' => $file['url'] ?? '',
            'mime_type' => $file['mimeType'] ?? '',
            'filesize' => (int) ($file['filesize'] ?? 0),
            'width' => $file['width'] ?? null,
            'height' => $file['height'] ?? null,
            'sizes' => $file['sizes'] ?? [],
        ];
    }
}
