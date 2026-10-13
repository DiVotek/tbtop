<?php

use App\Models\Note;
use App\Models\Page;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Commands\Resource\ColumnInfo;
use Tbtop\Admin\Commands\Resource\ResourceCode;
use Tbtop\Admin\Commands\Resource\ResourceNames;
use Tbtop\Admin\Tests\Fixtures\Resource\Column as EnumColumn;
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

it('warns about required columns the form never writes', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Note'])
        ->expectsOutputToContain('NOT NULL, no default): password, blob.')
        ->assertSuccessful();
});

it('warns that a model with the default guard gets every column as a field', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Tag'])
        ->expectsOutputToContain('Tag declares neither $fillable nor $guarded')
        ->assertSuccessful();

    expect(file_get_contents(app_path('Admin/Pages/Tags/TagFormFields.php')))->toContain("\$s->boolean('is_featured')")
        ->not->toContain('added_on')->not->toContain('changed_on')
        ->and(file_get_contents(app_path('Admin/Pages/Tags/IndexPage.php')))->toContain("Column::make('added_on')->label('Created')");
});

it('refuses --soft-deletes for a model without SoftDeletes', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Writer', '--soft-deletes' => true])->assertFailed();

    expect(file_exists(app_path('Admin/Pages/Writers')))->toBeFalse();
});

it('reads a bare MySQL string default as a literal, not an expression', function () {
    $blank = fn (mixed $default, string $driver): string => (new ColumnInfo('status', 'string', null, false, ColumnInfo::sqlDefault($default, 'string', $driver), false, false, null, null))->defaultLiteral();

    expect($blank('draft', 'mysql'))->toBe("'draft'")
        ->and($blank("it's", 'mysql'))->toBe("'it\\'s'")
        ->and($blank("'draft'", 'mysql'))->toBe("'draft'")
        ->and($blank('uuid()', 'mysql'))->toBe('null')
        ->and($blank('CURRENT_TIMESTAMP', 'mysql'))->toBe('null')
        ->and($blank("'draft'::character varying", 'pgsql'))->toBe("'draft'")
        ->and($blank('draft', 'sqlite'))->toBe('null');
});

it('lists every class the stubs import, so a model by that name gets aliased', function () {
    $sources = [...(glob(dirname(__DIR__).'/stubs/resource/*.stub') ?: []), dirname(__DIR__).'/src/Commands/Resource/ResourceStubs.php'];
    preg_match_all('/use ([A-Z][\\w\\\\]+);/', implode("\n", array_map('file_get_contents', $sources)), $matches);
    $imported = array_map(fn (string $class): string => class_basename(str_replace('\\\\', '\\', $class)), $matches[1]);

    expect(array_diff(array_unique($imported), ResourceNames::STUB_IMPORTS))->toBe([]);
});

it('keeps a class qualified when its short name clashes with a stub import', function () {
    $side = new ColumnInfo('side', 'string', null, false, null, false, false, EnumColumn::class, null);
    $code = (new ResourceCode([$side], 'notes', 'id', null, Note::class))->replacements();

    expect($code['{{ fieldImports }}'].$code['{{ columnImports }}'])->not->toContain('EnumColumn')->not->toContain('Resource\\Column;')
        ->and($code['{{ fields }}'])->toContain('\\'.EnumColumn::class.'::class');
});

it('aliases a model named like a stub import and keeps only its fillable columns', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Page', '--policy' => true, '--view' => true])->assertSuccessful();

    foreach (glob(app_path('Admin/Pages/Pages/*.php')) ?: [] as $file) {
        exec(escapeshellarg(PHP_BINARY).' -l '.escapeshellarg($file), $output, $status);
        expect($status)->toBe(0, $file);
    }
    expect(file_get_contents(app_path('Admin/Pages/Pages/IndexPage.php')))->toContain('use App\\Models\\Page as PageModel;')
        ->toContain('PageModel::query()')
        ->and(file_get_contents(app_path('Admin/Pages/Pages/PageFormFields.php')))
        ->toContain("\$s->text('title')->label('Title')->required()")
        ->toContain("\$s->relation('parent_id')->query(fn () => \\App\\Models\\Page::query())")
        ->toContain('// TODO secrets: json column')
        ->not->toContain('hits')
        ->and(Page::$authorCalled)->toBeFalse();
});

it('marks translatable attributes and loads their whole locale map on edit', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Note'])->assertSuccessful();

    $fields = (string) file_get_contents(app_path('Admin/Pages/Notes/NoteFormFields.php'));
    expect($fields)
        ->toContain("\$s->text('title')->label('Title')->required()->translatable()")
        ->toContain("[...\$record->only(['title', 'settings']), ...\$record->getTranslations()]");
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

    expect(resourceFile('ViewPage.php'))->toContain("return 'articles/{article}/view';")->toContain("'Writer' => \$record->writer?->name,")
        ->and(resourceFile('IndexPage.php'))->toContain('ViewPage::url(');
});

it('gates the pages through the model policy with --policy', function () {
    $this->artisan('make:tbtop-resource', ['model' => 'Writer', '--policy' => true])->assertSuccessful();

    expect(file_get_contents(app_path('Admin/Pages/Writers/IndexPage.php')))->toContain("return ['viewAny', Writer::class];")
        ->and(file_get_contents(app_path('Admin/Pages/Writers/CreatePage.php')))->toContain("return ['create', Writer::class];")
        ->and(file_get_contents(app_path('Admin/Pages/Writers/EditPage.php')))->toContain("Gate::authorize('update', \$record);")
        ->and(file_get_contents(app_path('Admin/Pages/Writers/CreatePage.php')))->toContain("Gate::authorize('create', Writer::class);")
        ->and(file_get_contents(app_path('Admin/Pages/Writers/WriterFormFields.php')))->not->toContain('api_token')->not->toContain('is_admin')
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
