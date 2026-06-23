<?php

namespace App\Admin\Pages;

use App\Admin\Pages\Concerns\MediaFormFields;
use App\Models\Media;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Actions\FormActions;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class MediaEditPage extends Page
{
    use MediaFormFields;

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
                FormActions::saveCancel($s, '/admin/media'),
            ])
                ->record([
                    ...$media->toArray(),
                    'file' => self::pathFromUrl($media->url),
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
     * A fresh upload carries a new path; the prefilled value is the path derived
     * from the stored url, so an equal path means "image untouched".
     *
     * @return array<string, mixed>
     */
    private static function fileColumns(mixed $file, Media $media): array
    {
        if (! is_string($file) || $file === self::pathFromUrl($media->url)) {
            return [];
        }

        return self::columnsFromPath($file);
    }

    /** Strip a leading /storage/ to recover the disk path; full urls pass through. */
    private static function pathFromUrl(string $url): string
    {
        return str_starts_with($url, '/storage/')
            ? substr($url, strlen('/storage/'))
            : $url;
    }
}
