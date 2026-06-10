<?php

namespace App\Admin\Pages;

use App\Admin\Pages\Concerns\PostFormFields;
use App\Models\Post;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

class PostEditPage extends Page
{
    use PostFormFields;

    public static function path(): string
    {
        return 'posts/{post}/edit';
    }

    public function title(): string
    {
        return 'Edit post';
    }

    public function view(S $s): Node
    {
        $post = Post::findOrFail(request()->route('post'));

        return $s->stack([
            $s->row([
                $s->action('unpublish')->label('Unpublish')
                    ->handle(function (ActionCtx $ctx): Effects {
                        Post::query()->whereKey($ctx->request->route('post'))->update(
                            [
                                'published' => false,
                                'published_at' => null
                            ]
                        );

                        return Effects::make()->notify('Post unpublished');
                    }),
            ]),
            $s->form('post', [
                ...$this->postFormSections($s, "unique:posts,slug,{$post->id}"),
                $s->actionsRow([
                    $s->action('save')->label('Save')->color('primary')
                        ->keybinding('mod+s')->submit(),
                    $s->action('delete')->label('Delete')->color('danger')
                        ->confirm('Delete post?', 'This cannot be undone.')
                        ->handle(function (ActionCtx $ctx): Effects {
                            Post::whereKey($ctx->request->route('post'))->delete();

                            return Effects::make()->notify('Post deleted')->redirect('/admin/posts');
                        }),
                    $s->action('cancel')->label('Cancel')->visit('/admin/posts'),
                ]),
            ])
                ->record($post->toArray())
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    Post::findOrFail($ctx->params['post'] ?? null)->update($ctx->form);

                    return Effects::make()->notify('Saved');
                }),
        ]);
    }
}
