<?php

namespace App\Admin\Pages;

use App\Admin\Pages\Concerns\MediaFormFields;
use App\Models\Media;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Actions\FormActions;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class MediaNewPage extends Page
{
    use MediaFormFields;

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
                    // The upload field emits a bare storage path string; derive
                    // the media columns from the file on the media disk.
                    $path = is_string($ctx->form['file'] ?? null) ? $ctx->form['file'] : '';
                    Media::create(self::columnsFromPath($path));

                    return '/admin/media';
                }),
        ]);
    }
}
