<?php

namespace Tbtop\Admin\Commands\Resource;

/**
 * Renders the resource's page files from stubs/resource/*.stub: the shared
 * names, the column-derived code from ResourceCode, and the flag-dependent
 * fragments (nav, policy gates, soft deletes).
 *
 * @internal
 */
final class ResourceStubs
{
    private const DIR = __DIR__.'/../../../stubs/resource/';

    public function __construct(
        private readonly ResourceNames $names,
        private readonly ResourceCode $code,
        private readonly ResourceOptions $options,
    ) {}

    /** @return array<string, string> file name (relative to the resource folder) => contents */
    public function files(): array
    {
        $files = [$this->names->trait().'.php' => $this->render('fields')];
        if ($this->options->simple) {
            return [...$files, 'IndexPage.php' => $this->render('simple')];
        }
        $files += [
            'IndexPage.php' => $this->render('index'),
            'CreatePage.php' => $this->render('create'),
            'EditPage.php' => $this->render('edit'),
        ];

        return $this->options->view ? [...$files, 'ViewPage.php' => $this->render('view')] : $files;
    }

    public function test(string $userClass): string
    {
        return $this->render('test', [
            '{{ userClass }}' => $userClass,
            '{{ userModel }}' => class_basename($userClass),
        ]);
    }

    /** @param  array<string, string>  $extra */
    private function render(string $stub, array $extra = []): string
    {
        $contents = (string) file_get_contents(self::DIR.$stub.'.stub');

        $rendered = strtr($contents, [...$this->fragments(), ...$this->code->replacements(), ...$extra, ...$this->names->replacements()]);

        return self::sortImports($rendered);
    }

    /** Orders the file's leading `use` block alphabetically, as Pint would, without duplicates. */
    private static function sortImports(string $php): string
    {
        return (string) preg_replace_callback('/^(?:use [^;\n]+;\n)+/m', function (array $block): string {
            $lines = array_values(array_unique(explode("\n", rtrim($block[0], "\n"))));
            usort($lines, fn (string $a, string $b): int => strcasecmp(rtrim($a, ';'), rtrim($b, ';')));

            return implode("\n", $lines)."\n";
        }, $php, 1);
    }

    /** @return array<string, string> */
    private function fragments(): array
    {
        $model = $this->names->model;

        return [
            '{{ nav }}' => $this->nav(),
            '{{ can:viewAny }}' => $this->can('viewAny'),
            '{{ can:view }}' => $this->can('viewAny'),
            '{{ can:create }}' => $this->can('create'),
            '{{ can:update }}' => $this->can('viewAny'),
            '{{ gateImport }}' => $this->options->policy ? "use Illuminate\\Support\\Facades\\Gate;\n" : '',
            '{{ authorizeUpdate }}' => $this->authorize('update', $this->options->simple ? 28 : 8),
            '{{ editDenied }}' => $this->options->policy ? " || Gate::denies('update', \$record)" : '',
            '{{ listNote }}' => $this->options->policy ? "\n                // viewAny lists every row; scope this query if the policy's view() hides some." : '',
            '{{ authorizeSave }}' => $this->authorize('update', 20),
            '{{ authorizeStore }}' => $this->options->policy ? "\n                    Gate::authorize('create', {$model}::class);" : '',
            '{{ authorizeView }}' => $this->authorize('view', 8),
            '{{ authorizeDelete }}' => $this->authorize('delete', 28),
            '{{ authorizeCreate }}' => $this->options->policy ? "\n                            Gate::authorize('create', {$model}::class);" : '',
            '{{ deleteRow }}' => $this->deleteRow(),
            '{{ deleteBulk }}' => $this->deleteBulk(),
            '{{ softDeletes }}' => $this->softDeletes(),
            '{{ trashedRow }}' => $this->ownTrashedActions() ? TrashedActions::row($model) : '',
            '{{ trashedBulk }}' => $this->ownTrashedActions() ? TrashedActions::bulk($model) : '',
            '{{ trashedImport }}' => $this->ownTrashedActions() ? "use Tbtop\\Admin\\Dsl\\Actions\\RecordAction;\n" : '',
            '{{ recordPage }}' => $this->options->view ? 'ViewPage' : 'EditPage',
        ];
    }

    private function softDeletes(): string
    {
        if (! $this->options->softDeletes) {
            return '';
        }
        $model = $this->names->model;
        $own = $this->ownTrashedActions() ? ", ['rowActions' => false, 'bulkActions' => false]" : '';

        return "\n                ->softDeletes(\$s, {$model}::class{$own})";
    }

    /** Under --policy the page writes restore/force-delete itself, so they authorize. */
    private function ownTrashedActions(): bool
    {
        return $this->options->softDeletes && $this->options->policy;
    }

    private function nav(): string
    {
        if ($this->options->navGroup === null) {
            return '';
        }
        $group = addslashes($this->options->navGroup);

        return "\n    /** @return array<string, mixed> */\n    public static function nav(): ?array\n    {\n        return ['group' => '{$group}', 'label' => '{$this->names->plural}'];\n    }\n";
    }

    private function can(string $ability): string
    {
        if (! $this->options->policy) {
            return '';
        }

        return "\n    /** @return array{0: string, 1: class-string} */\n    public static function can(): array\n    {\n        return ['{$ability}', {$this->names->model}::class];\n    }\n";
    }

    private function authorize(string $ability, int $indent): string
    {
        $pad = str_repeat(' ', $indent);

        return $this->options->policy ? "\n{$pad}Gate::authorize('{$ability}', \$record);" : '';
    }

    private function deleteRow(): string
    {
        $model = $this->names->model;
        $pad = str_repeat(' ', 24);
        if (! $this->options->policy) {
            return "{$pad}{$model}::query()->whereKey(\$ctx->key())->delete();";
        }

        return "{$pad}\$record = {$model}::query()->whereKey(\$ctx->key())->firstOrFail();\n{$pad}Gate::authorize('delete', \$record);\n{$pad}\$record->delete();";
    }

    private function deleteBulk(): string
    {
        $model = $this->names->model;
        $pad = str_repeat(' ', 24);
        if (! $this->options->policy) {
            return "{$pad}{$model}::query()->whereKey(\$ctx->selection)->delete();";
        }

        // Every record is authorized before any is deleted, so a denied one leaves the rest untouched.
        return "{$pad}\$records = {$model}::query()->whereKey(\$ctx->selection)->get();\n"
            ."{$pad}\$records->each(fn ({$model} \$record) => Gate::authorize('delete', \$record));\n"
            ."{$pad}\$records->each->delete();";
    }
}
