<?php

use Illuminate\Support\Facades\DB;
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

it('Relation search: dependent query receives the parent value via deps', function (): void {
    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/dependent_id',
        ['search' => '', 'deps' => ['author_id' => '2']],
    );

    $response->assertOk();
    $options = $response->json('options');
    expect($options)->toHaveCount(1);
    expect($options[0])->toMatchArray(['value' => '2', 'label' => 'Bob Jones']);
});

it('Relation search: dependent query with no deps yields an empty list', function (): void {
    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/dependent_id',
        ['search' => ''],
    );

    $response->assertOk();
    expect($response->json('options'))->toBe([]);
});

it('Relation search: dependent query ignores undeclared deps', function (): void {
    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/dependent_id',
        ['search' => '', 'deps' => ['author_id' => '2', 'spoof_id' => '1']],
    );

    $response->assertOk();
    $options = $response->json('options');
    expect($options)->toHaveCount(1);
    expect($options[0])->toMatchArray(['value' => '2', 'label' => 'Bob Jones']);
});

it('Relation search: dependent resolve-by-value honors the parent scope', function (): void {
    $hit = $this->postJson(
        '/admin/relation-search-page/relation-search/dependent_id',
        ['value' => '2', 'deps' => ['author_id' => '2']],
    );
    $hit->assertOk()->assertExactJson(['option' => ['value' => '2', 'label' => 'Bob Jones']]);

    $miss = $this->postJson(
        '/admin/relation-search-page/relation-search/dependent_id',
        ['value' => '1', 'deps' => ['author_id' => '2']],
    );
    $miss->assertOk()->assertExactJson(['option' => null]);
});

it('Relation search: resolve formats a translatable labelKey in the default content locale', function (): void {
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    AuthorModel::create(['name' => 'Iryna', 'title' => ['en' => 'Editor', 'uk' => 'Редактор']]);

    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/translated_id',
        ['value' => '4'],
    );

    $response->assertOk()
        ->assertExactJson(['option' => ['value' => '4', 'label' => 'Editor']]);
});

it('Relation search: search formats a translatable labelKey in the default content locale', function (): void {
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    AuthorModel::create(['name' => 'Iryna', 'title' => ['en' => 'Editor', 'uk' => 'Редактор']]);

    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/translated_id',
        ['search' => 'Edit'],
    );

    $response->assertOk();
    $options = $response->json('options');
    expect($options)->toHaveCount(1);
    expect($options[0])->toMatchArray(['value' => '4', 'label' => 'Editor']);
});

it('Relation search: translatable search matches a non-ASCII locale value', function (): void {
    config([
        'tbtop-admin.content_locales' => ['uk', 'en'],
        'tbtop-admin.default_content_locale' => 'uk',
    ]);
    AuthorModel::create(['name' => 'Iryna', 'title' => ['en' => 'Editor', 'uk' => 'Редактор']]);

    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/translated_id',
        ['search' => 'Редак'],
    );

    $response->assertOk();
    $options = $response->json('options');
    expect($options)->toHaveCount(1);
    expect($options[0])->toMatchArray(['value' => '4', 'label' => 'Редактор']);
});

it('Relation search: translatable label falls back to another locale when the default is empty', function (): void {
    config(['tbtop-admin.content_locales' => ['en', 'uk']]);
    AuthorModel::create(['name' => 'Iryna', 'title' => ['en' => null, 'uk' => 'Редактор']]);

    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/translated_id',
        ['value' => '4'],
    );

    $response->assertOk()
        ->assertExactJson(['option' => ['value' => '4', 'label' => 'Редактор']]);
});

it('Relation search: a JSON-encoded scalar label renders without its quotes', function (): void {
    // Rows written before a column became translatable hold an encoded scalar
    // ('"Editor"'), not a locale map — the raw value must still decode.
    AuthorModel::create(['name' => 'Iryna']);
    DB::table('authors')->where('name', 'Iryna')->update(['title' => '"Editor"']);

    $response = $this->postJson(
        '/admin/relation-search-page/relation-search/translated_id',
        ['value' => '4'],
    );

    $response->assertOk()
        ->assertExactJson(['option' => ['value' => '4', 'label' => 'Editor']]);
});
