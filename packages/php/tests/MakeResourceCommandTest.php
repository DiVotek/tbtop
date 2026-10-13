<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\TestCase;

use function App\Models\createResourceTables;

uses(TestCase::class);

require_once __DIR__.'/Fixtures/Resource/app-models.php';

beforeEach(function () {
    createResourceTables();
});

afterEach(function () {
    File::deleteDirectory(app_path('Admin/Pages'));
    File::deleteDirectory(base_path('tests/Feature/Admin'));
});

function resourceFile(string $name): string
{
    return (string) file_get_contents(app_path('Admin/Pages/Articles/'.$name));
}

it('writes the list, create and edit pages and the shared fields trait', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Article'])->assertSuccessful();

    foreach (['IndexPage.php', 'CreatePage.php', 'EditPage.php', 'ArticleFormFields.php'] as $file) {
        expect(file_exists(app_path('Admin/Pages/Articles/'.$file)))->toBeTrue();
    }
    expect(resourceFile('IndexPage.php'))
        ->toContain('namespace App\\Admin\\Pages\\Articles;')
        ->toContain("return 'articles';")
        ->toContain("return 'articles-index';")
        ->toContain("'group' => 'Main', 'label' => 'Articles'");
    expect(resourceFile('EditPage.php'))->toContain("return 'articles/{article}/edit';");
});

it('maps columns to fields, rules and table columns', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Article'])->assertSuccessful();

    expect(resourceFile('ArticleFormFields.php'))
        ->toContain("\$s->text('title')->label('Title')->required()")
        ->toContain("\$s->slug('slug')->fromField('title')")
        ->toContain("\$this->uniqueRule('slug', \$ignoreKey)")
        ->toContain("\$s->textarea('body')->label('Body')->rules(['nullable', 'string'])")
        ->toContain("\$s->boolean('published')->label('Published')->rules(['boolean'])")
        ->toContain("\$s->number('views')->label('Views')->required()->rules(['integer'])")
        ->toContain("\$s->select('status')->options(ArticleStatus::class)")
        ->toContain("\$s->relation('writer_id')->query(fn () => Writer::query())->labelKey('name')")
        ->toContain("'exists:writers,id'")
        ->toContain('// TODO meta: json column')
        ->toContain("'published' => false,")
        ->toContain("'views' => 0,")
        ->toContain('use Tbtop\\Admin\\Tests\\Fixtures\\Resource\\ArticleStatus;')
        ->not->toContain("'meta' =>")
        ->not->toContain('created_at');
    expect(resourceFile('IndexPage.php'))
        ->toContain("Column::make('title')->label('Title')->sortable()->searchable()")
        ->toContain("Column::make('writer.name')->label('Writer')")
        ->toContain("->with(['writer'])")
        ->toContain('->softDeletes($s, Article::class)')
        ->toContain('->recordUrl(fn (Article $record): string => EditPage::url(');
});

it('marks translatable attributes and loads their whole locale map on edit', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Note'])->assertSuccessful();

    $fields = (string) file_get_contents(app_path('Admin/Pages/Notes/NoteFormFields.php'));
    expect($fields)
        ->toContain("\$s->text('title')->label('Title')->required()->translatable()")
        ->toContain("[...\$record->only(['title']), ...\$record->getTranslations()]");
});

it('writes one modal-driven page with --simple', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Article', '--simple' => true])->assertSuccessful();

    expect(file_exists(app_path('Admin/Pages/Articles/CreatePage.php')))->toBeFalse()
        ->and(resourceFile('IndexPage.php'))->toContain('CreateAction::make(')->toContain('EditAction::make(');
});

it('refuses --view with --simple, which writes no edit page to link to', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Article', '--simple' => true, '--view' => true])->assertFailed();

    expect(file_exists(app_path('Admin/Pages/Articles')))->toBeFalse();
});

it('adds a view page the rows link to with --view', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Article', '--view' => true])->assertSuccessful();

    expect(resourceFile('ViewPage.php'))->toContain("return 'articles/{article}';")->toContain("'Writer' => \$record->writer?->name,")
        ->and(resourceFile('IndexPage.php'))->toContain('ViewPage::url(');
});

it('gates the pages through the model policy with --policy', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Writer', '--policy' => true])->assertSuccessful();

    expect(file_get_contents(app_path('Admin/Pages/Writers/IndexPage.php')))->toContain("return ['viewAny', Writer::class];")
        ->and(file_get_contents(app_path('Admin/Pages/Writers/CreatePage.php')))->toContain("return ['create', Writer::class];")
        ->and(file_get_contents(app_path('Admin/Pages/Writers/EditPage.php')))->toContain("Gate::authorize('update', \$record);")
        ->and(file_exists(app_path('Policies/WriterPolicy.php')))->toBeTrue();
    File::deleteDirectory(app_path('Policies'));
});

it('writes a feature test with --tests', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Writer', '--tests' => true])->assertSuccessful();

    expect(file_get_contents(base_path('tests/Feature/Admin/WritersTest.php')))
        ->toContain('use App\\Admin\\Pages\\Writers\\IndexPage;')
        ->toContain('$this->get(IndexPage::url())->assertOk();');
});

it('leaves the sidebar alone with --no-nav and uses --group otherwise', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Writer', '--group' => 'People'])->assertSuccessful();
    expect(file_get_contents(app_path('Admin/Pages/Writers/IndexPage.php')))->toContain("'group' => 'People'");

    $this->artisan('make:tbtop-resource', ['model' => 'Writer', '--no-nav' => true, '--force' => true])->assertSuccessful();
    expect(file_get_contents(app_path('Admin/Pages/Writers/IndexPage.php')))->not->toContain('function nav()');
});

it('writes nothing when a target exists, unless --force', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Writer'])->assertSuccessful();
    file_put_contents(app_path('Admin/Pages/Writers/EditPage.php'), '<?php // mine');
    unlink(app_path('Admin/Pages/Writers/IndexPage.php'));

    $this->artisan('make:tbtop-resource', ['model' => 'Writer'])->assertFailed();
    expect(file_exists(app_path('Admin/Pages/Writers/IndexPage.php')))->toBeFalse()
        ->and(file_get_contents(app_path('Admin/Pages/Writers/EditPage.php')))->toBe('<?php // mine');

    $this->artisan('make:tbtop-resource', ['model' => 'Writer', '--force' => true])->assertSuccessful();
    expect(file_get_contents(app_path('Admin/Pages/Writers/EditPage.php')))->toContain('class EditPage extends Page');
});

it('fails on an unknown model', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Nope'])->assertFailed();

    expect(is_dir(app_path('Admin/Pages/Nopes')))->toBeFalse();
});

it('writes TODO pages when the table is missing', function () {
    Schema::drop('notes');

    $this->artisan('make:tbtop-resource', ['model' => 'Note'])
        ->expectsOutputToContain('Table [notes] not found')
        ->assertSuccessful();
    expect(file_get_contents(app_path('Admin/Pages/Notes/NoteFormFields.php')))->toContain('// TODO: the table was missing');
});
