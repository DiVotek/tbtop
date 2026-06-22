<?php

namespace App\Admin\Pages;

use App\Models\Post;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Actions\FormActions;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Exercises a private upload on a PARAMETRISED page path (posts/{post}/documents).
 * The signed preview route inherits {post}, so the signed-url builder must thread
 * the page param through — the flat UploadDemoPage never covered this. Also shows
 * accept() with a list of mime types (PDF + images).
 */
class PostDocumentsPage extends Page
{
    public static function path(): string
    {
        return 'posts/{post}/documents';
    }

    public function title(): string
    {
        return 'Post documents';
    }

    public function view(S $s): Node
    {
        $post = Post::findOrFail(request()->route('post'));

        return $s->stack([
            $s->displayText("Documents for: {$post->title}")->variant('heading'),
            $s->form('documents', [
                // Private disk + list-form accept: allow PDFs and any image.
                $s->upload('contract')->label('Contract (private)')
                    ->disk('local')->directory('post-docs')->visibility('private')
                    ->accept(['application/pdf', 'image/*'])->maxSize(10 * 1024 * 1024),
                $s->actionsRow([
                    FormActions::save($s),
                ]),
            ])
                ->onSubmit(function (ActionCtx $ctx): string {
                    // Demo: no DB write — confirm the upload round-tripped.
                    return "/admin/posts/{$ctx->params['post']}/documents";
                }),
        ]);
    }
}
