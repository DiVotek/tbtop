<?php

namespace App\Admin\Pages;

use App\Admin\Pages\Concerns\PostFormFields;
use App\Models\Post;
use Tbtop\Admin\Actions\ActionCtx;
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
                $s->actionsRow([
                    $s->action('save')->label('Create')->color('primary')
                        ->keybinding('mod+s')->submit(),
                    $s->action('cancel')->label('Cancel')->visit('/admin/posts'),
                ]),
            ])
                ->record([
                    'title' => '',
                    'intro' => ['en' => '', 'uk' => ''],
                    'slug' => '',
                    'body' => null,
                    'published' => false,
                    'published_at' => null,
                    'rating' => null,
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
