<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\Effects;
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
            $s->grid(['cols' => 2], [
                $s->chart('byMonth', 'line', ['xKey' => 'month'])->query(fn () => [])->toNode(),
                $s->chart('byStatus', 'donut', ['nameKey' => 'status'])->query(fn () => [])->toNode(),
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
                    $s->relation('category_id')
                        ->labelKey('name')
                        ->searchable()
                        ->query(fn () => null),
                    $s->repeater('sections')->rules('array|max:10')->set('fields', [
                        $s->text('heading')->required(),
                        $s->textarea('text'),
                    ]),
                    $s->actionsRow([
                        $s->action('save')->label('Save')->color('primary')
                            ->keybinding('mod+s')->submit(),
                        $s->action('cancel')->label('Cancel')->visit('/admin/posts'),
                    ]),
                ])->record(['title' => 'Hello'])->onSubmit(fn () => Effects::make()),
            ]),
            $s->tabs([
                ['label' => 'Main', 'body' => $s->displayText('Tab body')->variant('subheading')],
            ]),
            $s->table('posts')
                ->columns([
                    'title' => 'Title',
                    'views' => 'Views',
                    Column::make('published')
                        ->label('Published')
                        ->toggle()
                        ->onSave(fn ($record, $value) => Effects::make()->refreshTable('posts')),
                    Column::make('title_edit')
                        ->label('Title (editable)')
                        ->textInput()
                        ->rules('required|max:200')
                        ->onSave(fn ($record, $value) => null),
                ])
                ->searchable(['title'])
                ->defaultSort('views', 'desc')
                ->tabs([
                    Tab::make('all'),
                    Tab::make('published')->label('Published')
                        ->query(fn ($q) => $q->where('published', true))
                        ->count(),
                ])
                ->rowActions([
                    $s->action('edit')->label('Edit')->handle(fn () => Effects::make(), needs: ['row']),
                    $s->action('delete')->label('Delete')->color('danger')
                        ->confirm('Delete?', 'No undo.')
                        ->handle(fn () => Effects::make(), needs: ['row']),
                ])
                ->bulkActions([
                    $s->action('bulk-delete')->label('Delete selected')
                        ->handle(fn () => Effects::make(), needs: ['selection']),
                ])
                ->query(fn () => null)
                ->toNode(),
            $s->actionsRow([
                $s->action('info')->label('About')->modal('About', $s->displayText('Modal body')->variant('muted')),
                $s->action('details')->label('Details')->modal('Details', null, 'More info')->size('lg'),
                $s->action('copy')->label('Copy')->custom('clipboard', ['text' => 'hi']),
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
                $s->userMenu(),
            ]),
        ]);
    }
}
