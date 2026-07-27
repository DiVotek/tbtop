<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Fixture page for EditableColumnHttpTest.
 * Uses the 'ecposts' table (created by the test beforeEach).
 */
class EditableColumnsPage extends Page
{
    public static function path(): string
    {
        return 'editable-posts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('ecposts')
                ->columns([
                    Column::make('title')
                        ->label('Title')
                        ->textInput()
                        ->rules('required|max:200')
                        ->onSave(function (mixed $record, mixed $value): Effects {
                            $record->title = $value;
                            $record->save();

                            return Effects::make()->refreshTable('ecposts');
                        }),
                    Column::make('published')
                        ->label('Published')
                        ->toggle()
                        ->onSave(function (mixed $record, mixed $value): Effects {
                            $record->published = (bool) $value;
                            $record->save();

                            return Effects::make()->refreshTable('ecposts');
                        }),
                    Column::make('note')
                        ->label('Note')
                        ->textInput()
                        ->rules('required|max:5')
                        ->onSave(function (mixed $record, mixed $value): void {
                            // deliberately returns void — tests default-effects branch
                            $record->note = $value;
                            $record->save();
                        }),
                    // Inline (sync) select: persists exactly like a text value via
                    // the same /cells endpoint; validation stays server-side via rules().
                    Column::make('status')
                        ->label('Status')
                        ->selectColumn()
                        ->options([
                            ['value' => 'draft', 'label' => 'Draft'],
                            ['value' => 'published', 'label' => 'Published'],
                        ])
                        ->rules('required|in:draft,published')
                        ->onSave(function (mixed $record, mixed $value): Effects {
                            $record->status = $value;
                            $record->save();

                            return Effects::make()->refreshTable('ecposts');
                        }),
                    // Editable but server-hidden: visible(false) is an authz gate,
                    // so the cell endpoint must reject it (404), not honor the edit.
                    Column::make('secret')
                        ->label('Secret')
                        ->visible(fn () => false)
                        ->textInput()
                        ->onSave(function (mixed $record, mixed $value): void {
                            $record->note = $value;
                            $record->save();
                        }),
                ])
                ->query(fn () => EcPost::query())
                ->toNode(),
            // Scoped table: only published rows are reachable — used to test
            // the "id outside query scope → 404" case.
            $s->table('ecposts_published')
                ->columns([
                    Column::make('title')
                        ->label('Title')
                        ->textInput()
                        ->rules('required|max:200')
                        ->onSave(function (mixed $record, mixed $value): Effects {
                            $record->title = $value;
                            $record->save();

                            return Effects::make()->refreshTable('ecposts_published');
                        }),
                ])
                ->query(fn () => EcPost::query()->where('published', true))
                ->toNode(),
            // Synthetic-attribute table: query adds a withExists() aggregate
            // alias, and the model's retrieved() listener both stamps a
            // non-column flag and normalizes a real column. Reproduces
            // "resolve -> save writes a synthetic attribute as if it were a
            // real column" and "a legitimate listener-driven column change
            // gets swallowed" (see EditableColumnController).
            $s->table('ecposts_with_synthetic')
                ->columns([
                    Column::make('title')
                        ->label('Title')
                        ->textInput()
                        ->rules('required|max:200')
                        ->onSave(function (mixed $record, mixed $value): Effects {
                            $record->title = $value;
                            $record->save();

                            return Effects::make()->refreshTable('ecposts_with_synthetic');
                        }),
                    // Reads back the resolved record's aliases without
                    // changing anything, so the response proves what onSave
                    // could see: the clean withExists() alias and the
                    // listener-stamped flag, both with their real values.
                    Column::make('note')
                        ->label('Note')
                        ->textInput()
                        ->onSave(function (mixed $record, mixed $value): Effects {
                            return Effects::make()->notify(sprintf(
                                'has_comments=%s is_returning=%s',
                                $record->has_comments ? 'true' : 'false',
                                $record->is_returning ? 'true' : 'false',
                            ));
                        }),
                ])
                ->query(fn () => EcPostWithSynthetic::query()->withExists(['comments as has_comments']))
                ->toNode(),
        ]);
    }
}
