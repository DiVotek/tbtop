<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Support\Facades\DB;
use Tbtop\Admin\Dsl\Actions\ExportAction;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\ExportFormat;
use Tbtop\Admin\Dsl\Fields\Boolean;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/** Fixture page for TableExportHttpTest, over the 'ecposts' table the test creates. */
class ExportPostsPage extends Page
{
    public static function path(): string
    {
        return 'export-posts';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->table('ecposts')
                ->columns([
                    Column::make('title')->label('Title')->sortable()->searchable(),
                    Column::make('published')->label('Published')->boolean(),
                    Column::make('status')->label('Status')->badge(['draft' => ['label' => 'Draft'], 'live' => ['label' => 'Live']]),
                    Column::make('sort_order')->label('Order')->export(as: fn ($value) => 'pos-'.$value),
                    Column::make('note')->label('Note')->export(label: 'Notes', enabled: false),
                ])
                ->filters([Boolean::make('published')])
                ->headerActions([
                    ExportAction::make($s),
                    ExportAction::make($s, maxRows: 2, name: 'exportSmall'),
                    ExportAction::make($s, name: 'exportGated')->authorize('never'),
                ])
                ->bulkActions([ExportAction::make($s, [ExportFormat::Csv], filename: 'picked', name: 'exportPicked')])
                ->query(fn () => EcPost::query())
                ->toNode(),
            $s->table('ecposts_published')
                ->columns(['title' => 'Title'])
                ->headerActions([ExportAction::make($s, name: 'exportPublished')])
                ->query(fn () => EcPost::query()->where('published', true))
                ->toNode(),
            $s->table('plain_posts')
                ->columns(['title' => 'Title'])
                ->headerActions([ExportAction::make($s, name: 'exportPlain')])
                ->query(fn () => DB::table('ecposts')->orderBy('id'))
                ->toNode(),
        ]);
    }
}
