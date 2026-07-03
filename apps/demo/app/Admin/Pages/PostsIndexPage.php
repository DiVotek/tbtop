<?php

namespace App\Admin\Pages;

use App\Models\Post;
use App\Models\User;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Actions\CreateAction;
use Tbtop\Admin\Dsl\Actions\DeleteAction;
use Tbtop\Admin\Dsl\Actions\EditAction;
use Tbtop\Admin\Dsl\Actions\ReplicateAction;
use Tbtop\Admin\Dsl\Actions\ViewAction;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Fields\Boolean;
use Tbtop\Admin\Dsl\Fields\Daterange;
use Tbtop\Admin\Dsl\Fields\InFilter;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Pages\Page;

class PostsIndexPage extends Page
{
    public static function path(): string
    {
        return 'posts';
    }

    public static function nav(): ?array
    {
        return ['group' => 'Content', 'label' => 'Posts', 'order' => 1, 'icon' => 'file-text', 'badge' => (string) Post::count()];
    }

    public function title(): string
    {
        return 'Posts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->actionsRow([
                $s->action('new')->label('New post')->color('primary')->visit('/admin/posts/new'),
            ]),
            $s->table('posts')
                ->rowClick('edit')
                ->headerActions([
                    // Quick create in a slide-over panel; the full form lives
                    // at PostCreatePage for the "New post" button above.
                    CreateAction::make(
                        $s,
                        form: $s->form('quickCreatePost', [
                            $s->text('title')->label('Title')->required()->rules('max:200')->translatable(),
                            $s->slug('slug')->label('Slug')->required()
                                ->set('fromField', 'title')
                                ->rules(['max:200', 'regex:/^[a-z0-9-]+$/', 'unique:posts,slug']),
                        ]),
                        storeUsing: function (ActionCtx $ctx): Effects {
                            Post::create($ctx->form);

                            return Effects::make()
                                ->notify('Post created')
                                ->closeModal()
                                ->refreshTable('posts');
                        },
                        defaultRecord: ['title' => null, 'slug' => ''],
                        name: 'quickCreate',
                        title: 'Quick create',
                    )->label('Quick create')->slideOver(),
                ])
                ->columns([
                    Column::make('cover_url')->image()->square()->label('Cover')->alt('Cover'),
                    Column::make('color')->color()->rounded()->label('Color'),
                    Column::make('title')
                        ->label('Title')
                        ->kind('text')
                        ->translatable()
                        ->sortable()
                        ->searchable(),
                    Column::make('slug')
                        ->label('Slug')
                        ->kind('text')
                        ->copyable(copyMessage: 'Slug copied!'),
                    Column::make('published')
                        ->label('Published')
                        ->toggle()
                        ->onSave(function (Post $post, bool $value): Effects {
                            $post->update([
                                'published' => $value,
                                'published_at' => $value ? now() : null,
                            ]);

                            return Effects::make()
                                ->notify($value ? 'Post published' : 'Post unpublished')
                                ->refreshTable('posts');
                        }),
                    Column::make('published_at')
                        ->label('Published')
                        ->date('Y-m-d')
                        ->sortable()
                        ->toggleable(true, true),
                    Column::make('views')
                        ->label('Views')
                        ->number()
                        ->sortable()
                        ->align('right'),
                ])
                ->filters([
                    InFilter::make('published')
                        ->label('Status')
                        ->options([
                            ['value' => '1', 'label' => 'Published'],
                            ['value' => '0', 'label' => 'Draft'],
                        ]),
                    Select::make('author_id')
                        ->label('Author')
                        ->options(
                            User::query()->pluck('email', 'id')
                                ->map(fn ($email, $id) => ['value' => $id, 'label' => $email])
                                ->values()
                                ->all()
                        ),
                    Daterange::make('published_at')->label('Published date'),
                    Boolean::make('with_rating')
                        ->label('Has rating')
                        ->filterUsing(
                            fn ($q, $v) => $q->when($v, fn ($q) => $q->whereNotNull('rating'))
                        ),
                ])
                ->filtersIn('modal')
                ->tabs([
                    Tab::make('all')->label('All'),
                    Tab::make('published')->label('Published')
                        ->query(fn ($q) => $q->where('published', true)),
                    Tab::make('draft')->label('Draft')
                        ->query(fn ($q) => $q->where('published', false))
                        ->count(),
                ])
                ->defaultSort('created_at', 'desc')
                ->paginate(25, [10, 25, 50, 100])
                ->query(fn () => Post::query())
                ->rowActions([
                    // Visit specs are static strings; a per-row URL needs the
                    // row id, so edit goes through a server redirect effect.
                    $s->action('edit')->label('Edit')->handle(
                        fn (ActionCtx $ctx): Effects => Effects::make()
                            ->redirect("/admin/posts/{$ctx->row['id']}/edit"),
                        needs: ['row'],
                    ),
                    // Prebuilt read-only detail modal, widened past the default
                    // 'md'; field()-bound values resolve from loadUsing per row.
                    ViewAction::make(
                        $s,
                        name: 'viewPost',
                        title: 'Post detail',
                        loadUsing: fn (ActionCtx $ctx): array => Post::query()
                            ->whereKey($ctx->row['id'] ?? null)
                            ->firstOrFail()
                            ->only(['slug', 'published', 'views']),
                        render: fn () => $s->stack([
                            $s->displayText('Slug')->variant('subheading'),
                            $s->displayValue(null)->field('slug'),
                            $s->displayText('Published')->variant('subheading'),
                            $s->displayValue(null)->boolean()->field('published'),
                            $s->displayText('Views')->variant('subheading'),
                            $s->displayValue(null)->field('views'),
                        ]),
                    )->modalWidth('2xl'),
                    // Prebuilt edit-in-place modal, named editPublication: opens a
                    // form prefilled per row (loadUsing keys match field names),
                    // saved by the helper's inner Save action. Hidden on drafts.
                    EditAction::make(
                        $s,
                        name: 'editPublication',
                        title: 'Edit publication',
                        saveName: 'savePublication',
                        form: $s->form('postPublication', [
                            $s->boolean('published')->label('Published')->rules('boolean'),
                            $s->date('published_at')->label('Published at')
                                ->rules('nullable|date')
                                ->hiddenIf('published', '=', false),
                        ]),
                        loadUsing: fn (ActionCtx $ctx): array => Post::query()
                            ->whereKey($ctx->row['id'] ?? null)
                            ->firstOrFail()
                            ->only(['published', 'published_at']),
                        saveUsing: function (ActionCtx $ctx): Effects {
                            Post::whereKey($ctx->row['id'] ?? null)->update([
                                'published' => (bool) ($ctx->form['published'] ?? false),
                                'published_at' => $ctx->form['published_at'] ?? null,
                            ]);

                            return Effects::make()
                                ->notify('Publication updated')
                                ->closeModal()
                                ->refreshTable('posts');
                        },
                    )->label('Publication')->hiddenIf('published', '=', false),
                    // Prebuilt clone: returns a redirect to edit the new copy.
                    ReplicateAction::make($s, using: function (ActionCtx $ctx): Effects {
                        $clone = Post::query()->whereKey($ctx->row['id'] ?? null)
                            ->firstOrFail()->replicate();
                        $clone->slug = $clone->slug.'-copy-'.uniqid();
                        $clone->save();

                        return Effects::make()
                            ->notify('Post replicated')
                            ->redirect("/admin/posts/{$clone->id}/edit");
                    }),
                    // Prebuilt delete: danger + confirm baked in by the helper.
                    DeleteAction::make($s, name: 'delete', using: function (ActionCtx $ctx): void {
                        Post::whereKey($ctx->row['id'] ?? null)->delete();
                    }),
                ])
                ->bulkActions([
                    // The helper guards an empty selection; the closure returns its
                    // own count-aware notify, overriding the default tail.
                    DeleteAction::make($s, name: 'delete-selected', bulk: true, using: function (ActionCtx $ctx): Effects {
                        $count = Post::whereKey($ctx->selection)->delete();

                        return Effects::make()
                            ->notify("Deleted {$count} post(s)")
                            ->refreshTable('posts');
                    }),
                ])
                ->toNode(),
            $s->table('users')
                ->columns([
                    'email' => 'Email',
                    'slug' => 'Slug',
                    'published' => 'Published',
                    'views' => 'Views',
                ])
                ->searchable(['title'])
                ->defaultSort('created_at', 'desc')
                ->query(fn () => User::query()),
        ]);
    }
}
