<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Actions\FormActions;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Exercises the new inline-config upload path: disk/directory/visibility plus
 * image conversion live on the field, not a config profile. Two fields show the
 * range: a public-disk upload (publicly linkable) and a private-disk upload
 * (stored on the `local` disk, served only through the app). Both re-encode to
 * webp at quality 80.
 */
class UploadDemoPage extends Page
{
    public static function path(): string
    {
        return 'upload-demo';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Upload field demo', 'order' => 97];
    }

    public function title(): string
    {
        return 'Upload demo';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Inline-config upload')->variant('heading'),
            $s->form('upload', [
                // Public disk: stored under public:docs, publicly linkable.
                $s->upload('doc')->label('Public document')->required()
                    ->disk('public')->directory('docs')->visibility('public')
                    ->accept('image/*')->maxSize(5 * 1024 * 1024)
                    ->convertTo('webp')->quality(80),
                // Private disk: stored on `local` (storage/app/private), never
                // symlinked to the web root — served only through the app.
                $s->upload('secret')->label('Private document')
                    ->disk('local')->directory('private-docs')->visibility('private')
                    ->accept('image/*')->maxSize(5 * 1024 * 1024)
                    ->convertTo('webp')->quality(80),
                // Multi-upload: public disk, reorderable, max 8 files.
                $s->upload('gallery')->label('Gallery (multi, reorderable)')
                    ->disk('public')->directory('gallery')->visibility('public')
                    ->accept('image/*')->maxSize(5 * 1024 * 1024)
                    ->multiple()->maxFiles(8)->reorderable(),
                $s->actionsRow([
                    FormActions::save($s),
                ]),
            ])
                // Seed saved values (stored as paths) so the preview renders on
                // page-enter: the private one via a fresh signed view url, the
                // public one via /storage. Remove a preview to reveal the picker.
                ->record([
                    'doc' => ['path' => 'docs/sample.webp', 'filename' => 'public-sample.webp'],
                    'secret' => ['path' => 'private-docs/sample.webp', 'filename' => 'confidential-sample.webp'],
                    'gallery' => [],
                ])
                ->onSubmit(function (ActionCtx $ctx): string {
                    // Demo: no DB write — just confirm the uploads round-tripped.
                    return '/admin/upload-demo';
                }),
        ]);
    }
}
