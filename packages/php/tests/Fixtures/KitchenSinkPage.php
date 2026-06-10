<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
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
            $s->heading('Kitchen sink', 2),
            $s->description('Every node kind the PHP DSL can emit.'),
            $s->divider(),
            $s->grid(['cols' => 2], [
                $s->chart('byMonth', 'line', ['xKey' => 'month'])->query(fn () => [])->toNode(),
                $s->chart('byStatus', 'donut', ['nameKey' => 'status'])->query(fn () => [])->toNode(),
            ]),
            $s->section(['title' => 'Form'], [
                $s->form('post', [
                    $s->text('title')->label('Title')->required()->rules('max:200'),
                    $s->textarea('body')->label('Body'),
                    $s->number('rating')->rules('integer|min:0|max:5'),
                    $s->boolean('published'),
                    $s->date('publishedAt'),
                    $s->select('role')->set('options', [
                        ['value' => 'admin', 'label' => 'Admin'],
                    ])->rules('in:admin,editor'),
                    $s->translatable('intro')->set('locales', ['en', 'uk']),
                    $s->slug('slug')->set('fromField', 'title')->rules(['regex:/^[a-z0-9-]+$/']),
                    $s->richtext('content')->set('placeholder', 'Start typing…'),
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
                ['label' => 'Main', 'body' => $s->heading('Tab body')],
            ]),
            $s->table('posts')
                ->columns(['title' => 'Title', 'views' => 'Views'])
                ->searchable(['title'])
                ->defaultSort('views', 'desc')
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
                $s->action('info')->label('About')->modal('About', $s->description('Modal body')),
                $s->action('copy')->label('Copy')->custom('clipboard', ['text' => 'hi']),
            ]),
        ]);
    }
}
