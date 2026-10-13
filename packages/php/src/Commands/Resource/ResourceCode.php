<?php

namespace Tbtop\Admin\Commands\Resource;

/**
 * Column-derived source fragments for the stubs: form fields, the blank and
 * edit records, table columns, eager loads and the view page's value map.
 * With no table (null columns) every fragment is a TODO skeleton.
 *
 * @internal
 */
final class ResourceCode
{
    private const VISIBLE_COLUMNS = 6;

    private readonly FieldCode $fields;

    /** @param  list<ColumnInfo>|null  $columns */
    public function __construct(
        private readonly ?array $columns,
        private readonly string $table,
        private readonly string $keyName,
        private readonly bool $timestamps,
        private readonly string $modelClass,
    ) {
        $this->fields = new FieldCode($columns ?? []);
    }

    /** @return array<string, string> */
    public function replacements(): array
    {
        [$fields, $fieldImports] = $this->imported($this->fieldLines());
        [$columns, $columnImports] = $this->imported($this->columnLines());

        return [
            '{{ fields }}' => $fields,
            '{{ fieldImports }}' => $fieldImports,
            '{{ columnImports }}' => $columnImports,
            '{{ blank }}' => $this->lines($this->formColumns(), fn (ColumnInfo $c): string => "'{$c->name}' => ".$this->fields->blank($c).',', 12),
            '{{ formRecord }}' => $this->formRecord(),
            '{{ uniqueRule }}' => $this->uniqueRule(),
            '{{ columns }}' => $columns,
            '{{ with }}' => $this->with(),
            '{{ display }}' => $this->display(),
            '{{ keyName }}' => $this->keyName,
        ];
    }

    private function fieldLines(): string
    {
        if ($this->columns === null) {
            return str_repeat(' ', 12)."// TODO: the table was missing when this was generated, add fields, e.g. \$s->text('name')->label('Name')->required(),";
        }

        return $this->lines($this->columns, function (ColumnInfo $c): string {
            $code = $this->fields->field($c);

            return str_starts_with($code, '//') ? $code : $code.',';
        }, 12);
    }

    /** @return list<ColumnInfo> columns that became a form field */
    private function formColumns(): array
    {
        return array_values(array_filter($this->columns ?? [], fn (ColumnInfo $c): bool => ! str_starts_with($this->fields->field($c), '//')));
    }

    private function formRecord(): string
    {
        $names = implode(', ', array_map(fn (ColumnInfo $c): string => "'{$c->name}'", $this->formColumns()));
        $only = "\$record->only([{$names}])";
        $translatable = array_filter($this->formColumns(), fn (ColumnInfo $c): bool => $c->translatable);

        // A translatable attribute reads as one locale; the form wants the whole map.
        return $translatable === [] ? $only : "[...{$only}, ...\$record->getTranslations()]";
    }

    private function uniqueRule(): string
    {
        $unique = array_filter($this->columns ?? [], fn (ColumnInfo $c): bool => $c->unique);
        if ($unique === []) {
            return '';
        }

        return "\n    private function uniqueRule(string \$column, int|string|null \$ignoreKey): string\n    {\n"
            ."        return 'unique:{$this->table},'.\$column.(\$ignoreKey === null ? '' : ','.\$ignoreKey.',{$this->keyName}');\n    }\n";
    }

    private function columnLines(): string
    {
        $lines = ["Column::make('{$this->keyName}')->label('ID')->sortable(),"];
        $shown = 0;
        foreach ($this->columns ?? [] as $column) {
            $code = $this->fields->column($column, $shown >= self::VISIBLE_COLUMNS);
            if ($code === null) {
                continue;
            }
            $lines[] = $code.',';
            $shown += $column->kind === 'text' ? 0 : 1;
        }
        if ($this->timestamps) {
            $lines[] = "Column::make('created_at')->label('Created')->datetime()->sortable()->toggleable(true, true),";
        }

        return $this->lines($lines, fn (string $line): string => $line, 20);
    }

    private function with(): string
    {
        $relations = array_values(array_filter(array_map(fn (ColumnInfo $c): ?string => $c->foreign['relation'] ?? null, $this->columns ?? [])));
        if ($relations === []) {
            return '';
        }

        return "->with(['".implode("', '", $relations)."'])";
    }

    private function display(): string
    {
        $rows = ["'ID' => \$record->getKey(),"];
        foreach ($this->formColumns() as $column) {
            $rows[] = "'".FieldCode::label($column)."' => ".$this->displayValue($column).',';
        }

        return $this->lines($rows, fn (string $row): string => $row, 16);
    }

    private function displayValue(ColumnInfo $column): string
    {
        $relation = $column->foreign['relation'] ?? null;
        if ($relation !== null) {
            return "\$record->{$relation}?->{$column->foreign['labelKey']}";
        }

        return $column->enum !== null ? "\$record->{$column->name}?->value" : "\$record->{$column->name}";
    }

    /**
     * Swaps each fully qualified `\\Class::` in $code for its short name and
     * returns the `use` lines it needs. A short name that would clash with the
     * model or another import stays qualified.
     *
     * @return array{0: string, 1: string}
     */
    private function imported(string $code): array
    {
        preg_match_all('/\\\\([A-Z][\\w\\\\]+)::/', $code, $matches);
        $taken = [strtolower(class_basename($this->modelClass)) => $this->modelClass];
        foreach (ResourceNames::STUB_IMPORTS as $short) {
            // Names the stubs import themselves (and the sibling pages): a model by one of them stays qualified.
            $taken[strtolower($short)] = $short;
        }
        $uses = [];
        foreach (array_unique($matches[1]) as $class) {
            $short = class_basename($class);
            if (($taken[strtolower($short)] ?? $class) !== $class) {
                continue;
            }
            $taken[strtolower($short)] = $class;
            if ($class !== $this->modelClass) {
                $uses[] = "use {$class};\n";
            }
            $code = str_replace('\\'.$class.'::', $short.'::', $code);
        }

        return [$code, implode('', $uses)];
    }

    /**
     * @template T
     *
     * @param  list<T>  $items
     * @param  callable(T): string  $line
     */
    private function lines(array $items, callable $line, int $indent): string
    {
        $pad = str_repeat(' ', $indent);

        return implode("\n", array_map(fn ($item): string => $pad.$line($item), $items));
    }
}
