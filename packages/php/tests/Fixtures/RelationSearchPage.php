<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Minimal page used by RelationSearchHttpTest to exercise the relation-search endpoint.
 */
class RelationSearchPage extends Page
{
    public static function path(): string
    {
        return 'relation-search-page';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->form('main', [
                $s->relation('author_id')
                    ->labelKey('name')
                    ->searchable()
                    ->query(fn () => AuthorModel::query()),
                $s->relation('translated_id')
                    ->labelKey('title')
                    ->searchable()
                    ->query(fn () => AuthorModel::query()),
                $s->relation('capped_id')
                    ->labelKey('name')
                    ->searchable()
                    ->searchLimit(2)
                    ->query(fn () => AuthorModel::query()),
                $s->relation('dependent_id')
                    ->labelKey('name')
                    ->dependsOn('author_id')
                    ->query(fn (array $deps) => AuthorModel::query()
                        ->where('id', $deps['spoof_id'] ?? $deps['author_id'] ?? 0)),
                $s->relation('created_author_id')
                    ->labelKey('name')
                    ->query(fn () => AuthorModel::query())
                    ->creatable([
                        $s->text('name')->label('Name')->required(),
                    ]),
                $s->relation('custom_author_id')
                    ->labelKey('name')
                    ->dependsOn('author_id')
                    ->query(fn (array $deps) => AuthorModel::query())
                    ->creatable(
                        [$s->text('name')->label('Name')->required()],
                        fn (array $validated, array $deps) => AuthorModel::create([
                            'name' => $validated['name'].' #'.($deps['author_id'] ?? '-'),
                        ]),
                    ),
                $s->relation('dependent_default_id')
                    ->dependsOn('author_id')
                    ->query(fn () => AuthorModel::query())
                    ->creatable([$s->text('name')]),
                $s->relation('guarded_author_id')
                    ->query(fn () => GuardedAuthorModel::query())
                    ->creatable([$s->text('name')->required()]),
                $s->relation('soft_author_id')
                    ->query(fn () => SoftAuthorModel::query())
                    ->creatable([$s->text('name')->required()]),
                $s->relation('scoped_default_id')
                    ->query(fn () => AuthorModel::query()->where('name', 'like', 'A%'))
                    ->creatable([$s->text('name')]),
                $s->relation('broken_author_id')
                    ->query(fn () => AuthorModel::query())
                    ->creatable([$s->text('name')], fn () => ['value' => '1']),
            ])->onSubmit(fn () => null),
        ]);
    }
}
