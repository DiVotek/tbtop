<?php

namespace Tbtop\Admin\Commands\Resource;

use Illuminate\Support\Str;

/**
 * PHP source for one column: its form field, its table column and its value
 * in a blank record. Returns null where a column has no sensible default
 * (a json column gets a TODO comment instead of a field).
 *
 * @internal
 */
final class FieldCode
{
    /** @param  list<ColumnInfo>  $siblings  for slug sources */
    public function __construct(private readonly array $siblings) {}

    /** Field builder chain, or a `// TODO` line. Uses $s, $ignoreKey and $this->uniqueRule(). */
    public function field(ColumnInfo $column): string
    {
        $base = $this->fieldBase($column);
        if ($base === null) {
            return "// TODO {$column->name}: {$column->kind} column, pick a field for it (keyvalue, repeater, tags…)";
        }

        $chain = $base."->label('".self::label($column)."')";
        $chain .= $column->isRequired() ? '->required()' : '';
        $chain .= $column->translatable ? '->translatable()' : '';
        $rules = $this->rules($column);

        return $rules === [] ? $chain : $chain.'->rules(['.implode(', ', $rules).'])';
    }

    /** Column::make(...) chain, or null when the column is not listed. */
    public function column(ColumnInfo $column, bool $hiddenByDefault): ?string
    {
        $relation = $column->foreign['relation'] ?? null;
        $tail = match (true) {
            $column->enum !== null => '->badge(\\'.$column->enum.'::class)',
            $column->foreign !== null => '',
            $column->translatable => '->translatable()',
            $column->kind === 'string' => '->sortable()->searchable()',
            $column->kind === 'integer', $column->kind === 'decimal' => '->number()->sortable()',
            $column->kind === 'boolean' => '->boolean()',
            $column->kind === 'date' => '->date()->sortable()',
            $column->kind === 'datetime' => '->datetime()->sortable()',
            $column->kind === 'time' => '->time()',
            $column->kind === 'text' => '',
            default => null,
        };
        if ($tail === null) {
            return null;
        }
        $name = $relation !== null ? $relation.'.'.$column->foreign['labelKey'] : $column->name;
        $hidden = $hiddenByDefault || $column->kind === 'text' ? '->toggleable(true, true)' : '';

        return "Column::make('{$name}')->label('".self::label($column)."')".$tail.$hidden;
    }

    /** Value the create form starts from: the column default when it is a literal. */
    public function blank(ColumnInfo $column): string
    {
        return $column->defaultLiteral();
    }

    public static function label(ColumnInfo $column): string
    {
        $name = $column->foreign !== null ? (string) preg_replace('/_id$/', '', $column->name) : $column->name;

        return addslashes(Str::headline($name));
    }

    private function fieldBase(ColumnInfo $column): ?string
    {
        $name = $column->name;
        if ($column->foreign !== null && $column->foreign['model'] !== null) {
            $model = '\\'.$column->foreign['model'];

            return "\$s->relation('{$name}')->query(fn () => {$model}::query())->labelKey('{$column->foreign['labelKey']}')->searchable()";
        }
        if ($column->enum !== null) {
            return "\$s->select('{$name}')->options(\\{$column->enum}::class)";
        }
        if ($name === 'slug' && $column->kind === 'string' && ($source = $this->slugSource()) !== null) {
            return "\$s->slug('{$name}')->fromField('{$source}')";
        }

        return match ($column->kind) {
            'string' => "\$s->text('{$name}')",
            'text' => "\$s->textarea('{$name}')",
            'integer', 'decimal' => "\$s->number('{$name}')",
            'boolean' => "\$s->boolean('{$name}')",
            'date' => "\$s->date('{$name}')",
            'datetime' => "\$s->datetime('{$name}')",
            'time' => "\$s->time('{$name}')",
            default => null,
        };
    }

    /** @return list<string> PHP expressions */
    private function rules(ColumnInfo $column): array
    {
        $rules = $column->nullable ? ["'nullable'"] : [];
        $rules = [...$rules, ...self::typeRules($column)];
        if ($column->foreign !== null) {
            $rules[] = "'exists:{$column->foreign['table']},{$column->foreign['column']}'";
        }
        if ($column->unique) {
            $rules[] = "\$this->uniqueRule('{$column->name}', \$ignoreKey)";
        }

        return $rules;
    }

    /** @return list<string> */
    private static function typeRules(ColumnInfo $column): array
    {
        if ($column->enum !== null) {
            return ["'in:'.implode(',', array_column(\\{$column->enum}::cases(), 'value'))"];
        }
        if ($column->translatable) {
            return [];
        }
        $max = $column->length !== null ? ["'max:{$column->length}'"] : [];

        return match ($column->kind) {
            'string' => [...(str_contains($column->name, 'email') ? ["'email'"] : []), ...($max ?: ["'max:255'"])],
            'text' => ["'string'"],
            'integer' => $column->foreign !== null ? [] : ["'integer'"],
            'decimal' => ["'numeric'"],
            'boolean' => ["'boolean'"],
            'date', 'datetime' => ["'date'"],
            'time' => ["'date_format:H:i'"],
            default => [],
        };
    }

    private function slugSource(): ?string
    {
        foreach (['title', 'name'] as $candidate) {
            foreach ($this->siblings as $sibling) {
                if ($sibling->name === $candidate) {
                    return $candidate;
                }
            }
        }

        return null;
    }
}
