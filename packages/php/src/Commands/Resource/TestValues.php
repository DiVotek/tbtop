<?php

namespace Tbtop\Admin\Commands\Resource;

use Illuminate\Support\Str;

/**
 * The PHP expressions the generated tests build records and form values
 * from: the model's factory when it has one, else sample values per column
 * kind in a `{var}Attributes()` helper written at the end of the file.
 *
 * @internal
 */
final class TestValues
{
    private readonly FieldCode $fields;

    /** @param  list<ColumnInfo>  $columns */
    public function __construct(
        private readonly array $columns,
        private readonly string $model,
        private readonly bool $hasFactory,
    ) {
        $this->fields = new FieldCode($columns);
    }

    /** An expression creating one stored record. */
    public function record(): string
    {
        return $this->hasFactory ? "{$this->model}::factory()->create()" : "{$this->model}::query()->forceCreate({$this->helperName()}())";
    }

    /** An expression creating two stored records, as a collection. */
    public function records(): string
    {
        return $this->hasFactory
            ? "{$this->model}::factory()->count(2)->create()"
            : "collect([{$this->record()}, {$this->record()}])";
    }

    /** An expression for the form values of a new record. */
    public function attributes(): string
    {
        if (! $this->hasFactory) {
            return $this->helperName().'()';
        }
        $plain = array_filter($this->formColumns(), fn (ColumnInfo $c): bool => ! $c->translatable);
        $names = implode(', ', array_map(fn (ColumnInfo $c): string => "'{$c->name}'", $plain));
        $translated = array_map(
            fn (ColumnInfo $c): string => ", '{$c->name}' => [config('app.locale') => ".$this->sample($c).']',
            array_filter($this->formColumns(), fn (ColumnInfo $c): bool => $c->translatable),
        );

        $made = "{$this->model}::factory()->make()->only([{$names}])";

        return $translated === [] ? $made : "[...{$made}".implode('', $translated).']';
    }

    /** The `{var}Attributes()` helper, when there is no factory to call. */
    public function helper(): string
    {
        if ($this->hasFactory) {
            return '';
        }
        $lines = array_map(fn (ColumnInfo $c): string => "        '{$c->name}' => ".$this->sampleValue($c).','.$this->todo($c), $this->formColumns());

        return "\n/** The model has no factory: sample values for one valid record. Check them against your rules. */\n"
            ."function {$this->helperName()}(): array\n{\n    return [\n".implode("\n", $lines)."\n    ];\n}\n";
    }

    /** A plain text field the edit cases change: the first string column that is not a slug, select or relation. */
    public function editColumn(): ?string
    {
        foreach ($this->formColumns() as $c) {
            if ($this->isPlainString($c) && $c->name !== 'slug') {
                return $c->name;
            }
        }

        return null;
    }

    /** A column the table searches: the first plain string column. */
    public function searchColumn(): ?string
    {
        foreach ($this->columns as $c) {
            if ($this->isPlainString($c)) {
                return $c->name;
            }
        }

        return null;
    }

    /** A required field the create case leaves empty. */
    public function requiredColumn(): ?string
    {
        foreach ($this->formColumns() as $c) {
            if ($c->isRequired() && ! $c->translatable) {
                return $c->name;
            }
        }

        return null;
    }

    /** A literal the edit case writes into $column. */
    public function changed(string $column): string
    {
        return str_contains($column, 'email') ? "'changed@example.com'" : "'Changed ".addslashes(Str::headline($column))."'";
    }

    /** @return list<ColumnInfo> */
    private function formColumns(): array
    {
        return array_values(array_filter($this->columns, fn (ColumnInfo $c): bool => ! str_starts_with($this->fields->field($c), '//')));
    }

    private function isPlainString(ColumnInfo $c): bool
    {
        return $c->kind === 'string' && $c->enum === null && $c->foreign === null && ! $c->translatable;
    }

    private function helperName(): string
    {
        return lcfirst($this->model).'Attributes';
    }

    private function sampleValue(ColumnInfo $c): string
    {
        return $c->translatable ? "[config('app.locale') => ".$this->sample($c).']' : $this->sample($c);
    }

    /** A value of the column's kind that passes the generated rules. */
    private function sample(ColumnInfo $c): string
    {
        if ($c->enum !== null) {
            return "\\{$c->enum}::cases()[0]->value";
        }
        if ($c->foreign !== null) {
            $related = $c->foreign['model'];

            return $related !== null && $c->isRequired() && ResourceTests::hasFactory($related) ? "\\{$related}::factory()->create()->getKey()" : 'null';
        }

        return match ($c->kind) {
            'string' => $this->sampleString($c),
            'text' => "'Sample text.'",
            'integer' => '1',
            'decimal' => "'9.99'",
            'boolean' => 'true',
            'date' => "'2026-01-15'",
            'datetime' => "'2026-01-15 10:00:00'",
            'time' => "'10:00'",
            default => 'null',
        };
    }

    private function sampleString(ColumnInfo $c): string
    {
        if (str_contains($c->name, 'email')) {
            return $c->unique ? "uniqid().'@example.com'" : "'jane@example.com'";
        }
        $base = Str::slug($c->name);

        return $c->unique ? "'{$base}-'.uniqid()" : "'Sample ".addslashes(Str::headline($c->name))."'";
    }

    private function todo(ColumnInfo $c): string
    {
        return $c->foreign !== null && $c->isRequired() && $this->sample($c) === 'null' ? ' // TODO: the key of an existing '.Str::headline((string) preg_replace('/_id$/', '', $c->name)) : '';
    }
}
