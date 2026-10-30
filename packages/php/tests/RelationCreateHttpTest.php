<?php

use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Tests\Fixtures\AuthorModel;
use Tbtop\Admin\Tests\RelationSearchHttpTestCase;

uses(RelationSearchHttpTestCase::class);

it('Relation create: without a closure it saves a new query() model and returns its option', function (): void {
    $response = $this->postJson(
        '/admin/relation-search-page/relation-create/created_author_id',
        ['name' => 'Ada Lovelace'],
    );

    $author = AuthorModel::query()->where('name', 'Ada Lovelace')->firstOrFail();
    $response->assertOk()
        ->assertExactJson(['value' => (string) $author->getKey(), 'label' => 'Ada Lovelace']);
});

it('Relation create: validation failure returns 422 and saves nothing', function (): void {
    $this->postJson('/admin/relation-search-page/relation-create/created_author_id', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['name']);

    expect(AuthorModel::query()->count())->toBe(0);
});

it('Relation create: only validated mini-form keys reach the model', function (): void {
    $this->postJson(
        '/admin/relation-search-page/relation-create/created_author_id',
        ['name' => 'Ada', 'title' => ['en' => 'Injected']],
    )->assertOk();

    expect(AuthorModel::query()->firstOrFail()->title)->toBeNull();
});

it('Relation create: the closure receives the validated data and the declared deps', function (): void {
    $response = $this->postJson(
        '/admin/relation-search-page/relation-create/custom_author_id',
        ['name' => 'Grace', 'deps' => ['author_id' => '7', 'spoof_id' => '1']],
    );

    $response->assertOk()->assertJsonPath('label', 'Grace #7');
});

it('Relation create: a closure that returns no model is a server error', function (): void {
    $this->withoutExceptionHandling();

    $this->postJson('/admin/relation-search-page/relation-create/broken_author_id', ['name' => 'x']);
})->throws(UnexpectedValueException::class, 'must return the created Eloquent model');

it('Relation create: a dependent relation without a closure refuses to save outside its scope', function (): void {
    $this->withoutExceptionHandling();

    $this->postJson('/admin/relation-search-page/relation-create/dependent_default_id', ['name' => 'x']);
})->throws(LogicException::class, 'pass creatable() a closure that sets the parent');

it('Relation create: a relation without creatable() returns 404', function (): void {
    $this->postJson('/admin/relation-search-page/relation-create/author_id', ['name' => 'Ada'])
        ->assertNotFound();
});

it('Relation create: serializes the mini-form and never the closure', function (): void {
    $s = new S;
    $node = $s->relation('author_id')
        ->query(fn () => AuthorModel::query())
        ->creatable([$s->text('name')->required()], fn () => null)
        ->toNode()
        ->jsonSerialize();

    expect($node['options']['create']['fields'][0])->toMatchArray(['kind' => 'text', 'name' => 'name'])
        ->and(json_encode($node))->not->toContain('Closure');
});

it('Relation create: a dependent relation without a closure fails when it renders', function (): void {
    $s = new S;
    $s->relation('city_id')
        ->query(fn () => AuthorModel::query())
        ->creatable([$s->text('name')])
        ->dependsOn('country_id')
        ->toNode();
})->throws(LogicException::class, 'pass creatable() a closure that sets the parent');

it('Relation create: a mini-form field cannot be named deps', function (): void {
    $s = new S;
    $s->relation('author_id')->creatable([$s->text('deps')]);
})->throws(InvalidArgumentException::class, 'cannot be named "deps"');
