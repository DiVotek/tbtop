<?php

namespace Tbtop\Admin\Tests;

use App\Admin\Pages\Articles\CreatePage;
use App\Admin\Pages\Articles\EditPage;
use App\Admin\Pages\Articles\IndexPage;
use App\Admin\Pages\Articles\ViewPage;
use App\Models\Article;
use App\Models\Writer;
use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Tests\Fixtures\Panels\ResourcePanel;
use Tbtop\Admin\Tests\Fixtures\Resource\SecretPolicy;

use function App\Models\createResourceTables;

require_once __DIR__.'/Fixtures/Resource/app-models.php';

/**
 * Runs make:tbtop-resource once per process, loads the generated classes,
 * and reboots the app so ResourcePanel routes them.
 */
class MakeResourceHttpTestCase extends TestCase
{
    /** @var list<class-string<Page>> */
    public static array $pages = [];

    protected function setUp(): void
    {
        parent::setUp();
        createResourceTables();
        if (self::$pages === []) {
            $this->registerPolicies();
            $this->generate();
            $this->refreshApplication();
            createResourceTables();
        }
        $this->registerPolicies();
        $this->actingAs(new AuthUser);
    }

    public function getEnvironmentSetUp($app)
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [ResourcePanel::class]);
    }

    private function registerPolicies(): void
    {
        Gate::policy(Article::class, SecretPolicy::class);
        Gate::policy(Writer::class, SecretPolicy::class);
    }

    private function generate(): void
    {
        $this->artisan('make:tbtop-resource', ['model' => 'Article', '--view' => true, '--policy' => true])->assertSuccessful();
        $this->artisan('make:tbtop-resource', ['model' => 'Writer', '--simple' => true, '--policy' => true])->assertSuccessful();

        // Traits before the pages that use them; nothing here is autoloadable.
        $files = glob(app_path('Admin/Pages/*/*.php')) ?: [];
        usort($files, fn (string $a, string $b): int => str_contains($b, 'FormFields') <=> str_contains($a, 'FormFields'));
        foreach ($files as $file) {
            require_once $file;
        }
        File::deleteDirectory(app_path('Admin/Pages'));

        self::$pages = [
            IndexPage::class,
            CreatePage::class,
            EditPage::class,
            ViewPage::class,
            \App\Admin\Pages\Writers\IndexPage::class,
        ];
    }
}
