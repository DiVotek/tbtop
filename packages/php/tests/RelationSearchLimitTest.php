<?php

use Tbtop\Admin\Tests\Fixtures\AuthorModel;
use Tbtop\Admin\Tests\RelationSearchHttpTestCase;

uses(RelationSearchHttpTestCase::class);

beforeEach(function (): void {
    foreach (range(1, 5) as $n) {
        AuthorModel::create(['name' => "Author {$n}"]);
    }
});

function searchOptions(string $field): array
{
    return test()->postJson(
        "/admin/relation-search-page/relation-search/{$field}",
        ['search' => ''],
    )->json('options');
}

it('Relation search: the field limit caps the result count', function (): void {
    expect(searchOptions('capped_id'))->toHaveCount(2);
});

it('Relation search: the config cap applies when the field sets none', function (): void {
    config()->set('tbtop-admin.relation.search_cap', 3);

    expect(searchOptions('author_id'))->toHaveCount(3);
});

it('Relation search: the field limit wins over the config cap', function (): void {
    config()->set('tbtop-admin.relation.search_cap', 4);

    expect(searchOptions('capped_id'))->toHaveCount(2);
});

it('Relation search: a null config cap falls back to the default', function (): void {
    config()->set('tbtop-admin.relation.search_cap', null);

    expect(searchOptions('author_id'))->toHaveCount(5);
});

it('Relation search: a zero config cap falls back to the default', function (): void {
    config()->set('tbtop-admin.relation.search_cap', 0);

    expect(searchOptions('author_id'))->toHaveCount(5);
});
