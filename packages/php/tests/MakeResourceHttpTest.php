<?php

use App\Models\Article;
use App\Models\Writer;
use Illuminate\Support\Facades\Gate;
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

    $this->get("/admin/articles/{$article->id}/view")->assertOk();
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

    $this->get("/admin/articles/{$article->id}/view")->assertForbidden();
    $this->get("/admin/articles/{$article->id}/edit")->assertForbidden();
    $this->post("/admin/articles/{$article->id}/edit/forms/article", ['title' => 'Renamed'])->assertForbidden();
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

it('authorizes restore and force delete of each trashed record', function () {
    $open = makeArticle();
    $secret = makeArticle(['title' => 'Secret', 'slug' => 'secret']);
    $open->delete();
    $secret->delete();
    $row = fn (Article $article): array => ['payload' => ['row' => ['_key' => $article->id]]];

    $this->postJson('/admin/articles/actions/restore', $row($secret))->assertForbidden();
    $this->postJson('/admin/articles/actions/forceDelete', $row($secret))->assertForbidden();
    $this->postJson('/admin/articles/actions/restoreSelected', ['payload' => ['selection' => [$secret->id]]])->assertForbidden();
    $this->postJson('/admin/articles/actions/restore', $row($open))->assertOk();

    expect(Article::withTrashed()->find($secret->id)?->trashed())->toBeTrue()
        ->and(Article::query()->find($open->id))->not->toBeNull();
});

it('refuses the create form to a user the policy denies create', function () {
    Gate::before(fn ($user, string $ability): ?bool => $ability === 'create' ? false : null);

    $this->post('/admin/articles/new/forms/article', ['title' => 'Hello', 'slug' => 'hello', 'status' => 'live'])->assertForbidden();
    expect(Article::query()->count())->toBe(0);
});

it('ignores the edited row in a --simple modal unique rule, and only that row', function () {
    $ada = Writer::query()->forceCreate(['name' => 'Ada', 'email' => 'ada@example.com']);
    Writer::query()->forceCreate(['name' => 'Grace', 'email' => 'grace@example.com']);
    $save = fn (string $email) => $this->postJson('/admin/writers/actions/editSave', [
        'payload' => ['row' => ['_key' => $ada->id], 'form' => ['name' => 'Ada L', 'email' => $email]],
    ]);

    $save('ada@example.com')->assertOk();
    $save('grace@example.com')->assertUnprocessable();
    expect($ada->fresh()->email)->toBe('ada@example.com');
});

it('deletes none of a selection that holds a record the policy denies', function () {
    $open = makeArticle();
    $secret = makeArticle(['title' => 'Secret', 'slug' => 'secret']);

    $this->postJson('/admin/articles/actions/delete-selected', ['payload' => ['selection' => [$open->id, $secret->id]]])->assertForbidden();

    expect(Article::query()->count())->toBe(2);
});
