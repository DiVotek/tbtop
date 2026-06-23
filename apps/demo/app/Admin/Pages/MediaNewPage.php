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
                    ->disk('public')->directory('uploads')->accept('image/*'),
                FormActions::saveCancel($s, '/admin/media'),
            ])
                ->record(['file' => null])
                ->onSubmit(function (ActionCtx $ctx): string {
                    $path = is_string($ctx->form['file'] ?? null) ? $ctx->form['file'] : null;
                    if ($path !== null) {
                        Media::create(Media::metadataFromPath($path));
                    }

                    return '/admin/media';
                }),
        ]);
    }
}
