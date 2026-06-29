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
                $s->relation('dependent_id')
                    ->labelKey('name')
                    ->dependsOn('author_id')
                    ->query(fn (array $deps) => AuthorModel::query()
                        ->where('id', $deps['spoof_id'] ?? $deps['author_id'] ?? 0)),
            ])->onSubmit(fn () => null),
        ]);
    }
}
