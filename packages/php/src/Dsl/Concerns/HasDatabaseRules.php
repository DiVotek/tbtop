<?php

namespace Tbtop\Admin\Dsl\Concerns;

use LogicException;
use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Fluent database-validation helpers for fields backed by a table.
 *
 * Composed onto Text/Select/Relation. These are server-only (never wire
 * constraints — the client cannot reach the DB). ignore() rewrites the
 * last unique rule to skip the editing record, e.g. on an edit page.
 *
 * @method static rules(string|array $rules)
 *
 * @phpstan-require-extends Field
 */
trait HasDatabaseRules
{
    /** Value must be unique in $table.$column (defaults column to field name). */
    public function unique(string $table, ?string $column = null): static
    {
        return $this->rules('unique:'.$table.','.($column ?? $this->name));
    }

    /** Value must exist in $table.$column (defaults column to field name). */
    public function exists(string $table, ?string $column = null): static
    {
        return $this->rules('exists:'.$table.','.($column ?? $this->name));
    }

    /**
     * Skip the given record when checking uniqueness (edit pages).
     * Appends ",{id},{idColumn}" to the most recent unique rule.
     */
    public function ignore(int|string $id, string $idColumn = 'id'): static
    {
        $rules = $this->ruleEntries();
        $index = $this->lastUniqueIndex($rules);
        if ($index === null) {
            throw new LogicException(
                "\"{$this->name}\": call unique() before ignore().",
            );
        }
        $rules[$index] = $rules[$index].','.$id.','.$idColumn;
        $this->replaceRules($rules);

        return $this;
    }

    /**
     * Index of the last unique rule, or null if none.
     *
     * @param  list<string>  $rules
     */
    private function lastUniqueIndex(array $rules): ?int
    {
        for ($i = count($rules) - 1; $i >= 0; $i--) {
            if (str_starts_with($rules[$i], 'unique:')) {
                return $i;
            }
        }

        return null;
    }
}
