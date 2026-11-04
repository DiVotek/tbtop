<?php

namespace Tbtop\Admin\Commands\Resource;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * The --tests feature file: CRUD cases on the tbtop() testing API for the
 * pages this resource writes, assembled from stubs/resource/tests/*.stub.
 * Records come from the model's factory; without one, from sample values
 * the file declares in a helper the author is told to check.
 *
 * @internal
 */
final class ResourceTests
{
    private const DIR = __DIR__.'/../../../stubs/resource/tests/';

    private readonly TestValues $values;

    /** @param  list<ColumnInfo>|null  $columns */
    public function __construct(
        private readonly ResourceNames $names,
        private readonly ResourceOptions $options,
        ?array $columns,
        private readonly bool $hasFactory,
        private readonly string $userClass,
    ) {
        $this->values = new TestValues($columns ?? [], $names->alias, $hasFactory);
    }

    /**
     * @param  class-string<Model>  $class
     * @param  list<ColumnInfo>|null  $columns
     */
    public static function for(string $class, ResourceNames $names, ResourceOptions $options, ?array $columns): self
    {
        $userClass = (string) (config('auth.providers.users.model') ?: 'App\\Models\\User');

        return new self($names, $options, $columns, self::hasFactory($class), $userClass);
    }

    /** @param  class-string<Model>  $class */
    public static function hasFactory(string $class): bool
    {
        return method_exists($class, 'factory') && class_exists(Factory::resolveFactoryName($class));
    }

    public function render(): string
    {
        $cases = $this->options->simple ? ['list', 'simple-create', 'simple-edit', 'delete'] : ['list', 'create', 'edit', 'delete'];
        if ($this->options->view) {
            $cases[] = 'view';
        }
        if ($this->options->softDeletes) {
            $cases[] = 'soft-deletes';
        }
        if ($this->options->policy) {
            $cases[] = $this->options->simple ? 'policy-simple' : 'policy';
        }
        $body = implode("\n", array_map(fn (string $case): string => $this->stub($case), $cases));

        return ResourceStubs::sortImports(rtrim($this->stub('header'))."\n\n".$body.$this->values->helper());
    }

    /** True when the file falls back to sample values the author should check. */
    public function usesSampleValues(): bool
    {
        return ! $this->hasFactory;
    }

    private function stub(string $name): string
    {
        $contents = (string) file_get_contents(self::DIR.$name.'.stub');

        return strtr($contents, [...$this->fragments(), ...$this->names->replacements()]);
    }

    /** @return array<string, string> */
    private function fragments(): array
    {
        $edit = $this->values->editColumn();

        return [
            '{{ userClass }}' => $this->userClass,
            '{{ userModel }}' => class_basename($this->userClass),
            '{{ gateImport }}' => $this->options->policy ? "use Illuminate\\Support\\Facades\\Gate;\n" : '',
            '{{ pageImports }}' => $this->pageImports(),
            '{{ beforeEach }}' => $this->beforeEach(),
            '{{ record }}' => $this->values->record(),
            '{{ records }}' => $this->values->records(),
            '{{ attributes }}' => $this->values->attributes(),
            '{{ searchCase }}' => $this->searchCase(),
            '{{ requiredCase }}' => $this->requiredCase(),
            '{{ editColumn }}' => $edit ?? '',
            '{{ editValue }}' => $edit === null ? '' : $this->values->changed($edit),
            '{{ editFill }}' => $edit === null ? '[]' : "['{$edit}' => ".$this->values->changed($edit).']',
            '{{ editCheck }}' => $edit === null ? '' : "\n\n    expect(\$record->fresh()->{$edit})->toBe(".$this->values->changed($edit).');',
            '{{ editPrefill }}' => $edit === null ? '' : "\n        ->assertFieldValue('{$edit}', \$record->{$edit})",
            '{{ modalPrefill }}' => $edit === null ? '' : "\n        ->assertFormData(['{$edit}' => \$record->{$edit}])",
        ];
    }

    private function pageImports(): string
    {
        $pages = $this->options->simple ? ['IndexPage'] : ['IndexPage', 'CreatePage', 'EditPage'];
        if ($this->options->view) {
            $pages[] = 'ViewPage';
        }
        $namespace = $this->names->namespace();

        return implode('', array_map(fn (string $page): string => "use {$namespace}\\{$page};\n", $pages));
    }

    private function beforeEach(): string
    {
        $user = class_basename($this->userClass);
        if (! $this->options->policy) {
            return "beforeEach(function () {\n    \$this->actingAs({$user}::factory()->create());\n});\n";
        }

        return "// Gate::before stands in for the policy, so the CRUD cases pass before it is written.\n"
            ."// Once it is, act as users it lets in and out instead.\n"
            ."beforeEach(function () {\n    \$this->allowed = true;\n    Gate::before(fn (): bool => \$this->allowed);\n"
            ."    \$this->actingAs({$user}::factory()->create());\n});\n";
    }

    private function searchCase(): string
    {
        $column = $this->values->searchColumn();
        if ($column === null) {
            return '';
        }

        return "\n\n    tbtop(IndexPage::class)->table()\n        ->search((string) \$records[0]->{$column})\n        ->assertCanSeeRecords(\$records[0]);";
    }

    private function requiredCase(): string
    {
        $column = $this->values->requiredColumn();
        if ($column === null) {
            return '';
        }
        $call = $this->options->simple
            ? "tbtop(IndexPage::class)->table()\n        ->callAction('create', form: [...{$this->values->attributes()}, '{$column}' => null])"
            : "tbtop(CreatePage::class)\n        ->fill([...{$this->values->attributes()}, '{$column}' => null])\n        ->submit()";

        $label = strtolower($this->names->label);

        return "\n\nit('refuses a {$label} without {$column}', function () {\n    {$call}\n        ->assertHasErrors(['{$column}' => 'required']);\n\n"
            ."    expect({$this->names->alias}::query()->count())->toBe(0);\n});";
    }
}
