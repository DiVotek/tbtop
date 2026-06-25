<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Actions\EditAction;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Cond;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Pages\Page;

/**
 * Exercises every DSL surface for the wire-grammar contract test.
 * Serialization snapshot lives in contracts/fixtures/kitchen-sink.json.
 */
class KitchenSinkPage extends Page
{
    public static function path(): string
    {
        return 'kitchen-sink';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Kitchen sink')->variant('heading'),
            $s->displayText('Every node kind the PHP DSL can emit.')->variant('muted'),
            $s->displayDivider(),
            $s->section(['title' => 'Display primitives'], [
                $s->displayValue('active')->badge(['active' => Color::Success]),
                $s->displayValue(true)->boolean(trueColor: Color::Success),
                $s->displayValue('shipped')->icon(['shipped' => ['icon' => 'truck', 'color' => 'success']]),
                $s->displayValue(12345)->money('USD'),
                $s->displayValue('2024-03-15 10:30:00')->date('Y-m-d'),
                $s->displayValue(1234.5)->number(2),
                $s->displayImage('/img/cover.png')->alt('Cover')->caption('Figure 1'),
                $s->displayImage('/img/avatar.png')->circular(),
                $s->displayImage('/img/thumb.png')->square(),
                $s->displayImage('/files/report.pdf')->asLink(),
                $s->displayRichtext([
                    'root' => [
                        'children' => [
                            [
                                'children' => [
                                    ['detail' => 0, 'format' => 0, 'mode' => 'normal', 'style' => '', 'text' => 'Hello', 'type' => 'text', 'version' => 1],
                                ],
                                'direction' => 'ltr', 'format' => '', 'indent' => 0, 'type' => 'paragraph', 'version' => 1,
                            ],
                        ],
                        'direction' => 'ltr', 'format' => '', 'indent' => 0, 'type' => 'root', 'version' => 1,
                    ],
                ]),
                $s->displayKeyValue(['SKU' => 'A-1', 'Weight' => '2kg']),
            ]),
            $s->grid(['cols' => 2], [
                $s->stat('Revenue')->value(42)->delta('+8%', 'up')
                    ->icon('dollar-sign')->tooltip('Monthly revenue')
                    ->hiddenIf('period', '=', 'all')->toNode(),
                $s->chart('byMonth', 'line', ['xKey' => 'month'])->query(fn () => [])->toNode(),
                $s->chart('byStatus', 'donut', ['nameKey' => 'status'])
                    ->query(fn () => [])
                    ->hiddenIf('view', '!=', 'status')
                    ->toNode(),
                $s->chart('byInterval', 'bar', ['xKey' => 'period'])
                    ->query(fn () => [])
                    ->params([
                        $s->select('interval')->set('options', [
                            ['value' => 'day', 'label' => 'Day'],
                            ['value' => 'week', 'label' => 'Week'],
                            ['value' => 'month', 'label' => 'Month'],
                        ])->default('day'),
                        $s->date('from'),
                    ])
                    ->toNode(),
            ]),
            $s->section(['title' => 'Form'], [
                $s->form('post', [
                    $s->text('title')->label('Title')->required()->rules('max:200'),
                    $s->otp('auth_code')->label('Code')->length(6)->rules('digits:6'),
                    $s->textarea('body')->label('Body')
                        ->helperText('Supports Markdown.')->tooltip('Write the post body here.'),
                    $s->number('rating')->rules('integer|min:0|max:5'),
                    $s->boolean('published'),
                    $s->date('publishedAt')->hiddenIf('published', '=', false),
                    $s->text('video_url')->hiddenIf('type', '!=', 'video'),
                    $s->text('caption')->disabledIf(
                        Cond::all(Cond::eq('status', 'archived'), Cond::empty('published_at'))
                    ),
                    $s->select('role')->set('options', [
                        ['value' => 'admin', 'label' => 'Admin'],
                    ])->rules('in:admin,editor'),
                    $s->select('permissions')->options([
                        ['value' => 'read', 'label' => 'Read'],
                        ['value' => 'write', 'label' => 'Write'],
                        ['value' => 'delete', 'label' => 'Delete'],
                    ])->multiple()->rules('in:read,write,delete')
                        ->creatable(
                            fields: [$s->text('name')->label('Permission name')->required()],
                            using: fn (array $v): array => ['value' => $v['name'], 'label' => $v['name']],
                        ),
                    $s->text('intro')->translatable(),
                    $s->slug('slug')->set('fromField', 'title')->rules(['regex:/^[a-z0-9-]+$/']),
                    $s->richtext('content')->set('placeholder', 'Start typing…'),
                    $s->upload('attachment')->label('Attachment')
                        ->disk('public')->directory('docs')->visibility('public')
                        ->accept('image/*')->maxSize(5 * 1024 * 1024)
                        ->convertTo('webp')->quality(80),
                    $s->upload('gallery')->label('Gallery')
                        ->disk('public')->directory('gallery')
                        ->accept('image/*')->maxSize(5 * 1024 * 1024)
                        ->multiple()->maxFiles(5)->reorderable(),
                    $s->relation('category_id')
                        ->labelKey('name')
                        ->searchable()
                        ->query(fn () => null),
                    $s->repeater('sections')->rules('array|max:10')->minItems(1)->defaultItems(2)->set('fields', [
                        $s->text('heading')->required(),
                        $s->textarea('text'),
                    ]),
                    $s->checkboxlist('tags')->options([
                        ['value' => 'news', 'label' => 'News'],
                        ['value' => 'guide', 'label' => 'Guide'],
                    ])->rules('array'),
                    $s->togglebuttons('visibility')->options([
                        ['value' => 'public', 'label' => 'Public'],
                        ['value' => 'private', 'label' => 'Private'],
                    ])->rules('in:public,private'),
                    $s->togglebuttons('channels')->options([
                        ['value' => 'email', 'label' => 'Email'],
                        ['value' => 'sms', 'label' => 'SMS'],
                    ])->multiple()->rules('array'),
                    $s->slider('score')->min(0)->max(10)->step(1)->rules('min:0|max:10'),
                    $s->actionsRow([
                        $s->action('save')->label('Save')->color('primary')
                            ->keybinding('mod+s')->submit(),
                        $s->action('cancel')->label('Cancel')->visit('/admin/posts'),
                    ]),
                ])->record(['title' => 'Hello'])->onSubmit(fn () => Effects::make()),
            ]),
            $s->tabs([
                ['label' => 'Main', 'body' => $s->displayText('Tab body')->variant('subheading'), 'icon' => 'star', 'badge' => '3'],
                ['label' => 'More', 'body' => $s->displayText('Second tab')->variant('muted')],
            ]),
            $s->table('posts')
                ->columns([
                    'title' => 'Title',
                    'views' => 'Views',
                    Column::make('cover')->image()->circular()->alt('Avatar'),
                    Column::make('brand_color')->color()->rounded()->label('Color'),
                    Column::make('published')
                        ->label('Published')
                        ->toggle()
                        ->onSave(fn ($record, $value) => Effects::make()->refreshTable('posts')),
                    Column::make('title_edit')
                        ->label('Title (editable)')
                        ->textInput()
                        ->rules('required|max:200')
                        ->onSave(fn ($record, $value) => null),
                    Column::make('status_edit')
                        ->label('Status (editable)')
                        ->selectColumn()
                        ->options([
                            ['value' => 'draft', 'label' => 'Draft'],
                            ['value' => 'published', 'label' => 'Published'],
                        ])
                        ->rules('required|in:draft,published')
                        ->onSave(fn ($record, $value) => null),
                ])
                ->searchable(['title'])
                ->searchPlaceholder('Search posts…')
                ->emptyState('No posts yet', 'Create your first post to get started.', 'file-text')
                ->headerActions([
                    $s->action('createPost')->label('New post')->icon('pencil')->visit('/admin/posts/create'),
                ])
                ->recordUrl(fn () => '/admin/posts/1')
                ->openRecordUrlInNewTab()
                ->defaultSort('views', 'desc')
                ->reorderable('sort_order')
                ->tabs([
                    Tab::make('all'),
                    Tab::make('published')->label('Published')
                        ->icon('check')->tooltip('Published posts')
                        ->query(fn ($q) => $q->where('published', true))
                        ->count(),
                ])
                ->rowActions([
                    $s->action('edit')->label('Edit')->icon('pencil')->tooltip('Edit this record')
                        ->hiddenIf('published', '=', true)
                        ->handle(fn () => Effects::make(), needs: ['row']),
                    $s->action('delete')->label('Delete')->color('danger')->icon('trash')
                        ->disabledIf('locked', 'truthy')
                        ->confirm('Delete?', 'No undo.')
                        ->handle(fn () => Effects::make(), needs: ['row']),
                ])
                ->bulkActions([
                    $s->action('bulk-delete')->label('Delete selected')
                        ->hiddenIf('role', '=', 'manager')
                        ->handle(fn () => Effects::make(), needs: ['selection']),
                ])
                ->query(fn () => null)
                ->toNode(),
            $s->actionsRow([
                $s->action('info')->label('About')->modal('About', $s->displayText('Modal body')->variant('muted'))->size('sm')->outlined(),
                $s->action('details')->label('Details')->modal('Details', null, 'More info')->modalWidth('lg'),
                $s->action('copy')->label('Copy')->custom('clipboard', ['text' => 'hi'])->link(),
                // Prebuilt edit-in-place: exercises the modal query/queryNeeds wire
                // shape so the contract gate covers a modal+query action spec.
                EditAction::make(
                    $s,
                    form: $s->form('editPost', [
                        $s->text('title')->label('Title')->required()->rules('max:200'),
                        $s->boolean('published')->label('Published'),
                    ]),
                    loadUsing: fn () => ['title' => 'Hello', 'published' => true],
                    saveUsing: fn () => Effects::make(),
                    title: 'Edit post',
                ),
            ]),
            $s->collapsible(['label' => 'Advanced options'], [
                $s->text('meta_title')->label('Meta title'),
            ]),
            $s->aside([
                $s->text('sidebar_note')->label('Note'),
            ]),
            $s->actionGroup('Publish actions', [
                $s->action('publish')->label('Publish')->visit('/admin/posts/publish'),
                $s->action('archive')->label('Archive')
                    ->handle(fn () => Effects::make(), needs: ['row']),
            ]),
            $s->flex([$s->text('flex_a'), $s->text('flex_b')], direction: 'row', justify: 'between', align: 'center', gap: 4, wrap: true),
            $s->row([
                $s->logo(),
                $s->navMenu(),
                $s->spacer(),
                $s->localeSwitcher(),
                $s->notifications(),
                $s->userMenu(),
            ]),
        ]);
    }
}
