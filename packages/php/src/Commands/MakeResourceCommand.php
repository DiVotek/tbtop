<?php

namespace Tbtop\Admin\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Commands\Resource\ColumnInfo;
use Tbtop\Admin\Commands\Resource\PanelDiscovery;
use Tbtop\Admin\Commands\Resource\ResourceCode;
use Tbtop\Admin\Commands\Resource\ResourceNames;
use Tbtop\Admin\Commands\Resource\ResourceOptions;
use Tbtop\Admin\Commands\Resource\ResourceStubs;
use Tbtop\Admin\Commands\Resource\RouteClashes;
use Tbtop\Admin\Commands\Resource\SchemaReader;
use Tbtop\Admin\Commands\Resource\UnfilledColumns;

/**
 * Writes list, create and edit pages for a model into the host, with fields,
 * columns and rules read from its table. The output is plain host code: the
 * package keeps no notion of a "resource".
 */
class MakeResourceCommand extends Command
{
    protected $signature = 'make:tbtop-resource
        {model : Model class, e.g. Post or App\\Models\\Post}
        {--simple : One list page; create and edit open in modals}
        {--view : Add a read-only view page the rows link to}
        {--soft-deletes : Trashed tabs plus restore and force delete (automatic for SoftDeletes models; refused without the trait)}
        {--policy : Gate the pages through the model policy, creating it when missing}
        {--tests : Write a feature test for the list page}
        {--group=Main : Nav group label}
        {--no-nav : Leave the list page out of the sidebar}
        {--force : Overwrite existing files}';

    protected $description = 'Scaffold admin pages for a model from its database table';

    public function handle(): int
    {
        $class = $this->modelClass();
        if ($class === null) {
            return self::FAILURE;
        }
        $names = new ResourceNames($class, app()->getNamespace());
        if (($refusal = $this->refusal($class, $names)) !== null) {
            $this->components->error($refusal);

            return self::FAILURE;
        }
        /** @var Model $model */
        $model = new $class;
        $columns = SchemaReader::read($model);
        if ($columns === null) {
            $this->components->warn("Table [{$model->getTable()}] not found: writing pages with TODOs in place of fields. Run the migration and --force to regenerate.");
        }

        $stubs = new ResourceStubs($names, new ResourceCode($columns, $model->getTable(), $model->getKeyName(), $model->usesTimestamps() ? $model->getCreatedAtColumn() : null, $class), $this->resourceOptions($class));
        $dir = app_path('Admin/Pages/'.$names->folder);
        $files = $this->targets($dir, $stubs);
        if ($files === null) {
            return self::FAILURE;
        }

        if (! $this->write($files)) {
            return self::FAILURE;
        }
        $this->policy($class);
        $this->warnColumns($model, $columns);
        $this->reportDiscovery($dir, $names);

        return self::SUCCESS;
    }

    /**
     * Why nothing may be written, or null.
     *
     * @param  class-string<Model>  $class
     */
    private function refusal(string $class, ResourceNames $names): ?string
    {
        if ($this->option('simple') && $this->option('view')) {
            return '--view needs the separate edit page that --simple does not write: drop one of them.';
        }
        if ($this->option('soft-deletes') && ! in_array(SoftDeletes::class, class_uses_recursive($class), true)) {
            return "--soft-deletes needs the SoftDeletes trait on [{$class}]: add it, or drop the flag.";
        }
        $clashes = RouteClashes::find($names, (bool) $this->option('simple'), (bool) $this->option('view'));

        return $clashes === [] ? null : 'The generated pages would collide with existing ones: '.implode('; ', $clashes).'. Rename or remove those pages first.';
    }

    /** @return class-string<Model>|null */
    private function modelClass(): ?string
    {
        $name = ltrim(trim((string) $this->argument('model')), '\\');
        $candidates = [$name, rtrim(app()->getNamespace(), '\\').'\\Models\\'.$name];
        foreach ($candidates as $candidate) {
            if (class_exists($candidate) && is_subclass_of($candidate, Model::class)) {
                return $candidate;
            }
        }
        $this->components->error("Model [{$name}] not found: pass a class extending ".Model::class.'.');

        return null;
    }

    /** @param  class-string<Model>  $class */
    private function resourceOptions(string $class): ResourceOptions
    {
        return new ResourceOptions(
            simple: (bool) $this->option('simple'),
            view: (bool) $this->option('view'),
            softDeletes: in_array(SoftDeletes::class, class_uses_recursive($class), true),
            policy: (bool) $this->option('policy'),
            navGroup: $this->option('no-nav') ? null : (string) ($this->option('group') ?: 'Main'),
            totallyGuarded: (new $class)->totallyGuarded(),
        );
    }

    /**
     * Every file to write, keyed by absolute path; null (after an error) when
     * one exists and --force is off, so nothing is half-written.
     *
     * @return array<string, string>|null
     */
    private function targets(string $dir, ResourceStubs $stubs): ?array
    {
        $files = [];
        foreach ($stubs->files() as $name => $contents) {
            $files[$dir.'/'.$name] = $contents;
        }
        if ($this->option('tests')) {
            $user = (string) (config('auth.providers.users.model') ?: 'App\\Models\\User');
            $files[base_path('tests/Feature/Admin/'.basename($dir).'Test.php')] = $stubs->test($user);
        }

        $existing = array_filter(array_keys($files), 'file_exists');
        if ($existing !== [] && ! $this->option('force')) {
            $this->components->error('Already exists, nothing written (use --force to overwrite): '.implode(', ', $existing));

            return null;
        }

        return $files;
    }

    /** @param  array<string, string>  $files */
    private function write(array $files): bool
    {
        foreach ($files as $path => $contents) {
            $dir = dirname($path);
            if ((! is_dir($dir) && ! @mkdir($dir, 0755, true)) || @file_put_contents($path, $contents) === false) {
                $this->components->error("Could not write [{$path}]: check that the directory is writable.");

                return false;
            }
            $this->components->info("Created: {$path}");
        }

        return true;
    }

    /** @param  class-string<Model>  $class */
    private function policy(string $class): void
    {
        if (! $this->option('policy')) {
            $this->components->warn('No --policy: anyone who can open the panel can create, edit and delete these records.');

            return;
        }
        if (Gate::getPolicyFor($class) !== null) {
            return;
        }
        $this->call('make:policy', ['name' => class_basename($class).'Policy', '--model' => $class]);
        $this->components->warn(class_basename($class).'Policy is a stub whose methods return false: every generated page answers 403 until you fill it in.');
    }

    /** @param  list<ColumnInfo>|null  $columns */
    private function warnColumns(Model $model, ?array $columns): void
    {
        if ($columns !== null && $model->totallyGuarded()) {
            $this->components->warn(class_basename($model).' declares neither $fillable nor $guarded, so every column became a field. Remove any editors must not set (roles, flags, owner ids).');
        }
        $unfilled = $columns === null ? [] : UnfilledColumns::of($model, $columns);
        if ($unfilled !== []) {
            $this->components->warn('Not in the form but required by the table (NOT NULL, no default): '.implode(', ', $unfilled).'. Set them before save, or saving fails.');
        }
    }

    private function reportDiscovery(string $dir, ResourceNames $names): void
    {
        $id = PanelDiscovery::panelFor($dir);
        $id === null
            ? $this->components->warn("No panel discovers [{$dir}]: register its pages with pages().")
            : $this->components->info("Panel [{$id}] discovers {$names->namespace()}. Run tbtop:cache-pages if the page index is cached.");
    }
}
