<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use Tbtop\Admin\Dsl\Concerns\HasAffixes;
use Tbtop\Admin\Dsl\Concerns\HasDatabaseRules;
use Tbtop\Admin\Dsl\Concerns\HasDependencies;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\RelationSearchLimit;
use Tbtop\Admin\Dsl\S;

final class Relation extends Field
{
    use HasAffixes;
    use HasDatabaseRules;
    use HasDependencies;
    use HasServerQuery;

    /** Server-only — never serialized to the wire. */
    private ?int $searchLimit = null;

    /** Server-only — never serialized to the wire. */
    private ?Closure $creatableUsing = null;

    /** @var list<Field> Fields of the create mini-form (validated server-side). */
    private array $creatableFieldList = [];

    protected function kind(): string
    {
        return 'relation';
    }

    /** Type-ahead over the relation-search endpoint; without it the field renders the resolved label only. */
    public function searchable(bool $value = true): static
    {
        return $this->set('searchable', $value);
    }

    /** Column name used as the display label in the relation picker. */
    public function labelKey(string $column): static
    {
        return $this->set('labelKey', $column);
    }

    /** Returns the label column name (defaults to 'name' when not set). */
    public function getLabelKey(): string
    {
        return (string) ($this->opts['labelKey'] ?? 'name');
    }

    /** Caps how many rows the search endpoint returns. Server-only — never serialized. */
    public function searchLimit(int $max): static
    {
        $this->searchLimit = $max;

        return $this;
    }

    public function getSearchLimit(): int
    {
        return RelationSearchLimit::resolve($this->searchLimit);
    }

    /**
     * Create a related record from the picker: a "+ Create" link under the field
     * opens a mini-form, and the saved record becomes the field's value.
     *
     * $fields: the mini-form; each field's own rules validate it server-side.
     * $using: fn(array $validated, array $deps): Model — omit it to fill a new
     *         instance of the query() model with the validated data and save it
     *         (its $fillable applies). Pass it when query() is scoped, e.g. by a
     *         dependsOn() parent, so the new row lands inside that scope.
     *
     * @param  list<Field>  $fields
     */
    public function creatable(array $fields, ?callable $using = null): static
    {
        $this->creatableUsing = $using === null ? null : Closure::fromCallable($using);
        $this->creatableFieldList = $fields;

        // Serialize only the field nodes — the closure stays server-side.
        $this->opts['create'] = ['fields' => array_map(
            fn (Field $f) => $f->toNode(),
            S::normalizeChildren($fields),
        )];

        return $this;
    }

    public function isCreatable(): bool
    {
        return isset($this->opts['create']);
    }

    /** Returns the creation closure, null for the default fill-and-save (never sent to the wire). */
    public function creatableClosure(): ?Closure
    {
        return $this->creatableUsing;
    }

    /**
     * Returns the field list passed to creatable() for validation.
     *
     * @return list<Field>
     */
    public function creatableFields(): array
    {
        return $this->creatableFieldList;
    }
}
