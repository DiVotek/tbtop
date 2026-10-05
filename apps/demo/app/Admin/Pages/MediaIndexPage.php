<?php

namespace App\Admin\Pages;

use App\Models\Media;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Actions\DeleteAction;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class MediaIndexPage extends Page
{
    public static function path(): string
    {
        return 'media';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Media', 'order' => 2, 'icon' => 'image'];
    }

    public function title(): string
    {
        return 'Media';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->actionsRow([
                $s->action('upload')->label('Upload')->color('primary')->url('/admin/media/new'),
            ]),
            $s->table('media')
                ->columns([
                    Column::make('preview')->image()->square()->label('Preview')->alt('Preview'),
                    'filename' => 'Filename',
                    'mime_type' => 'Type',
                    'filesize' => 'Size',
                ])
                ->defaultSort('created_at', 'desc')
                // Only images get a preview URL; an image cell with an empty value
                // renders blank instead of a broken <img> for PDFs and text files.
                ->query(fn () => Media::query()->selectRaw(
                    "media.*, case when mime_type like 'image/%' then url end as preview"
                ))
                ->rowActions([
                    $s->action('edit')->label('Edit')->url('/admin/media/{row.id}/edit'),
                    // Prebuilt delete; the using closure returns the page's own
                    // copy + named refreshTable, overriding the helper's tail.
                    DeleteAction::make($s, using: function (ActionCtx $ctx): Effects {
                        Media::whereKey($ctx->row['id'] ?? null)->delete();

                        return Effects::make()->notify('File deleted')->refreshTable('media');
                    })->confirm('Delete file?', 'This cannot be undone.'),
                ])
                ->toNode(),
        ]);
    }
}
