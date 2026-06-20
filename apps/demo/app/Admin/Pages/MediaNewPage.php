<?php

namespace App\Admin\Pages;

use App\Models\Media;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Actions\FormActions;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class MediaNewPage extends Page
{
    public static function path(): string
    {
        return 'media/new';
    }

    public function title(): string
    {
        return 'Upload media';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('upload', [
                $s->upload('file')->label('Image')->required()
                    ->set('entity', 'media')
                    ->set('accept', 'image/*'),
                FormActions::saveCancel($s, '/admin/media'),
            ])
                ->record(['file' => null])
                ->onSubmit(function (ActionCtx $ctx): string {
                    // The upload field's form value is the UploadRow the
                    // upload endpoint returned (camelCase keys).
                    $file = is_array($ctx->form['file'] ?? null) ? $ctx->form['file'] : [];
                    Media::create([
                        'filename' => $file['filename'] ?? '',
                        'url' => $file['url'] ?? '',
                        'mime_type' => $file['mimeType'] ?? '',
                        'filesize' => (int) ($file['filesize'] ?? 0),
                        'width' => $file['width'] ?? null,
                        'height' => $file['height'] ?? null,
                        'sizes' => $file['sizes'] ?? [],
                    ]);

                    return '/admin/media';
                }),
        ]);
    }
}
