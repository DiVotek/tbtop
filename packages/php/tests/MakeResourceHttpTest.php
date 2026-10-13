<?php

use App\Models\Article;
use App\Models\Writer;
use Tbtop\Admin\Tests\MakeResourceHttpTestCase;

uses(MakeResourceHttpTestCase::class);

function makeArticle(array $attributes = []): Article
{
    return Article::query()->forceCreate([
        'title' => 'First', 'slug' => 'first', 'status' => 'draft', ...$attributes,
    ]);
}

it('renders the generated list page and serves its rows with the relation label', function () {
    $writer = Writer::query()->forceCreate(['name' => 'Ada']);
    makeArticle(['writer_id' => $writer->id]);

    $this->get('/admin/articles', ['X-Inertia' => 'true'])->assertOk()->assertJsonPath('component', 'admin/page');
    $rows = $this->getJson('/admin/articles/tables/articles')->assertOk()->json('data.data');

    expect($rows)->toHaveCount(1)
        ->and($rows[0]['title'])->toBe('First')
        ->and($rows[0]['writer.name'] ?? data_get($rows[0], 'writer.name'))->toBe('Ada');
});

it('creates a record and lands on its edit page', function () {
    $this->post('/admin/articles/new/forms/article', [
        'title' => 'Hello', 'slug' => 'hello', 'status' => 'live', 'views' => 3, 'published' => true,
    ])->assertRedirect();

    $article = Article::query()->where('slug', 'hello')->firstOrFail();
    expect($article->views)->toBe(3)->and($article->published)->toBeTrue();
});

it('rejects a missing required column and a duplicate unique one', function () {
    makeArticle();

    $this->from('/admin/articles/new')->post('/admin/articles/new/forms/article', [
        'slug' => 'first', 'status' => 'draft', 'views' => 0,
    ])->assertSessionHasErrors(['title', 'slug']);
});

it('saves an edit, keeping its own unique value', function () {
    $article = makeArticle();

    $this->get("/admin/articles/{$article->id}/edit", ['X-Inertia' => 'true'])->assertOk()
        ->assertJsonPath('props.data.article.title', 'First');
    $this->from("/admin/articles/{$article->id}/edit")->post("/admin/articles/{$article->id}/edit/forms/article", [
        'title' => 'Renamed', 'slug' => 'first', 'status' => 'live', 'views' => 0, 'published' => false,
    ])->assertSessionHasNoErrors();

    expect($article->fresh()->title)->toBe('Renamed');
});

it('soft deletes a row from the list', function () {
    $article = makeArticle();

    $this->postJson('/admin/articles/actions/delete', ['payload' => ['row' => ['_key' => $article->id]]])->assertOk();

    expect(Article::query()->find($article->id))->toBeNull()
        ->and(Article::withTrashed()->find($article->id))->not->toBeNull();
});

it('renders the view page', function () {
    $article = makeArticle();

    $this->get("/admin/articles/{$article->id}")->assertOk();
});

it('creates and edits in modals on a --simple resource', function () {
    $this->postJson('/admin/writers/actions/createStore', ['payload' => ['form' => ['name' => 'Ada']]])->assertOk();
    $writer = Writer::query()->where('name', 'Ada')->firstOrFail();

    $this->postJson('/admin/writers/actions/editSave', [
        'payload' => ['row' => ['_key' => $writer->id], 'form' => ['name' => 'Grace']],
    ])->assertOk();

    expect($writer->fresh()->name)->toBe('Grace');
});

it('refuses a record the policy denies on the view page, the edit page and the delete action', function () {
    $article = makeArticle(['title' => 'Secret']);

    $this->get("/admin/articles/{$article->id}")->assertForbidden();
    $this->get("/admin/articles/{$article->id}/edit")->assertForbidden();
    $this->postJson('/admin/articles/actions/delete', ['payload' => ['row' => ['_key' => $article->id]]])->assertForbidden();
    expect($article->fresh())->not->toBeNull();
});

it('refuses to load or save a record the policy denies in a --simple modal', function () {
    $writer = Writer::query()->forceCreate(['name' => 'Secret']);

    $this->postJson('/admin/writers/actions/edit/data', ['payload' => ['row' => ['_key' => $writer->id]]])->assertForbidden();
    $this->postJson('/admin/writers/actions/editSave', [
        'payload' => ['row' => ['_key' => $writer->id], 'form' => ['name' => 'Grace']],
    ])->assertForbidden();
    expect($writer->fresh()->name)->toBe('Secret');
});
