<?php

use Tbtop\Admin\Tests\Fixtures\AuthorModel;
use Tbtop\Admin\Tests\RelationSearchHttpTestCase;

uses(RelationSearchHttpTestCase::class);

beforeEach(function (): void {
    AuthorModel::create(['name' => 'Alice Smith']);
    AuthorModel::create(['name' => 'Bob Jones']);
    AuthorModel::create(['name' => 'Alice Wonder']);
});

it('Relation search: empty search returns all results up to cap', function (): void {
    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/author_id',
        ['search' => ''],
    );

    $response->assertOk();
    $options = $response->json('options');
    expect($options)->toHaveCount(3);
    expect($options[0])->toMatchArray(['value' => '1', 'label' => 'Alice Smith']);
});

it('Relation search: search term filters by labelKey using LIKE', function (): void {
    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/author_id',
        ['search' => 'alice'],
    );

    $response->assertOk();
    $options = $response->json('options');
    expect($options)->toHaveCount(2);
    $names = array_column($options, 'label');
    expect($names)->toContain('Alice Smith')
        ->toContain('Alice Wonder');
});

it('Relation search: value resolve returns the matching option', function (): void {
    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/author_id',
        ['value' => '2'],
    );

    $response->assertOk()
        ->assertExactJson(['option' => ['value' => '2', 'label' => 'Bob Jones']]);
});

it('Relation search: value resolve returns null for unknown id', function (): void {
    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/author_id',
        ['value' => '999'],
    );

    $response->assertOk()
        ->assertExactJson(['option' => null]);
});

it('Relation search: unknown field name returns 404', function (): void {
    $this->postJson(
        '/admin/relation-search-page/relation-search/nonexistent_field',
        ['search' => ''],
    )->assertNotFound();
});
