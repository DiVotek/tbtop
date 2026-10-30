<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Fields\Boolean;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Pages\Page;

/** One page for each thing the testing API reads: field states, a form, a table, gated actions. */
class TestingApiPage extends Page
{
    /** @var array<string, mixed>|null */
    public static ?array $submitted = null;

    public static function path(): string
    {
        return 'testing-api/{post}';
    }

    public static function can(): string
    {
        return 'view-testing-api';
    }

    public function title(): string
    {
        return 'Testing API';
    }

    public function view(S $s): Node
    {
        $post = CaPost::query()->findOrFail(request()->route('post'));

        return $s->stack([
            $s->form('post', [
                $s->text('title')->label('Title')->required()->rules('max:20'),
                $s->text('slug')->disabled(),
                $s->text('internal_notes')->when(false),
                $s->boolean('published')->label('Published'),
                $s->action('quickSave')->label('Quick save')->handle(
                    fn (ActionCtx $ctx): Effects => Effects::make()->notify("Quick {$ctx->form['title']}"),
                    needs: ['form'],
                ),
            ])
                ->record(['title' => $post->title, 'slug' => 'post-'.$post->id, 'published' => $post->published])
                ->onSubmit(function (ActionCtx $ctx): Effects|string {
                    static::$submitted = $ctx->form;
                    if ($ctx->form['title'] === 'leave') {
                        return '/admin/elsewhere';
                    }

                    return Effects::make()->notify('Saved')->resetForm('post');
                }),
            $s->action('archive')->label('Archive')->authorize('archive-posts')
                ->handle(fn (): Effects => Effects::make()->notify('Archived'), needs: ['row']),
            $s->table('posts')
                ->columns([Column::make('title')->sortable(), Column::make('published')->label('Published')])
                ->searchable(['title'])
                ->filters([Boolean::make('published')])
                ->tabs([
                    Tab::make('all'),
                    Tab::make('live')->query(fn ($q) => $q->where('published', true))->count(),
                ])
                ->defaultSort('title', 'asc')
                ->paginate(2, [2, 10])
                ->rowActions([
                    $s->action('rename')->handle(function (ActionCtx $ctx): Effects {
                        CaPost::whereKey($ctx->key())->update(['title' => $ctx->row['title'].'!']);

                        return Effects::make()->refreshTable('posts');
                    }, needs: ['row']),
                ])
                ->query(fn () => CaPost::query())
                ->toNode(),
        ]);
    }
}
