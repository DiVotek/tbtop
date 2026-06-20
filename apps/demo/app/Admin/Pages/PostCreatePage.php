<?php

namespace App\Admin\Pages;

use App\Admin\Pages\Concerns\PostFormFields;
use App\Models\Post;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Dsl\Actions\FormActions;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class PostCreatePage extends Page
{
    use PostFormFields;

    public static function path(): string
    {
        return 'posts/new';
    }

    public function title(): string
    {
        return 'New post';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('post', [
                ...$this->postFormSections($s, 'unique:posts,slug'),
                FormActions::saveCancel($s, '/admin/posts', saveLabel: 'Create'),
            ])
                ->record([
                    'title' => null,
                    'intro' => null,
                    'slug' => '',
                    'body' => null,
                    'published' => false,
                    'published_at' => null,
                    'rating' => null,
                    'cover_media_id' => null,
                    'author_id' => null,
                    'sections' => [],
                ])
                ->onSubmit(function (ActionCtx $ctx): string {
                    $post = Post::create($ctx->form);

                    return "/admin/posts/{$post->id}/edit";
                }),
        ]);
    }
}
