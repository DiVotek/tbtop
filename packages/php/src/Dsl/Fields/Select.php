<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use Tbtop\Admin\Dsl\Concerns\HasAffixes;
use Tbtop\Admin\Dsl\Concerns\HasDatabaseRules;
use Tbtop\Admin\Dsl\Concerns\HasDependencies;
use Tbtop\Admin\Dsl\Concerns\HasMultiple;
use Tbtop\Admin\Dsl\Concerns\HasOptions;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\S;

class Select extends Field
{
    use HasAffixes;
    use HasDatabaseRules;
    use HasDependencies;
    use HasMultiple;
    use HasOptions;
    use HasServerQuery;

    /** Server-only closure resolving a stored value back to its label. */
    private ?Closure $resolveUsing = null;

    /** Server-only closure for creating a new option on the fly. */
    private ?Closure $creatableUsing = null;

    /** @var list<Field> Fields for the create mini-form (used for server-side validation). */
    private array $creatableFieldList = [];

    protected function kind(): string
    {
        return 'select';
    }

    /**
     * Render as a filterable combobox instead of a plain select. With static
     * options the filtering is client-side over labels; with query() the typed
     * term reaches the closure and filtering happens server-side.
     */
    public function searchable(bool $value = true): static
    {
        return $this->set('searchable', $value);
    }

    /**
     * Dynamic option source, served from the select-options endpoint. Any source
     * works — a database, a config array, an enum, an external API.
     *
     * $fn: fn(array $deps, string $search): array
     *   $deps   — current values of the fields named in dependsOn(), or [].
     *   $search — the user's current search text, '' when the list first opens.
     *
     * Return either a list of ['value' => ..., 'label' => ...] rows, or an
     * associative value => label map (e.g. User::pluck('name', 'id')).
     *
     * Applying $search and capping the result count are the closure's
     * responsibility — nothing filters or truncates on its behalf.
     *
     * A stored value's label is resolved from the associative map when the
     * closure returns one and the value is present; otherwise from
     * resolveUsing(); otherwise the raw value is displayed.
     */
    public function query(callable $fn): static
    {
        $this->queryClosure = Closure::fromCallable($fn);

        // The closure stays server-side; the wire only says "fetch me from the
        // select-options endpoint", which is what the client dispatches on.
        return $this->set('async', true);
    }

    /**
     * Resolve a stored value back to its display label when query() cannot.
     *
     * $fn: fn(string $value): string|array|null — null when the value no longer
     * exists. Return an option array (['label' => ..., 'display' => [...]]) to
     * keep image/subtitle/html on a value the dropdown never listed.
     */
    public function resolveUsing(callable $fn): static
    {
        $this->resolveUsing = Closure::fromCallable($fn);

        return $this;
    }

    /** Returns the label resolver for server-side use (never sent to the wire). */
    public function resolveClosure(): ?Closure
    {
        return $this->resolveUsing;
    }

    /**
     * Allow creating a new option on the fly.
     *
     * $fields: form fields shown in the creation mini-form.
     * $using: server closure fn(array $validated): array{value: string, label: string}
     *         Must return ['value' => ..., 'label' => ...].
     *
     * @param  list<Field>  $fields
     */
    public function creatable(array $fields, callable $using): static
    {
        $this->creatableUsing = Closure::fromCallable($using);
        $this->creatableFieldList = $fields;

        // Serialize only the field nodes — closure stays server-side.
        $this->opts['create'] = ['fields' => array_map(
            fn (Field $f) => $f->toNode(),
            S::normalizeChildren($fields),
        )];

        return $this;
    }

    /** Returns the creation closure for server-side use (never sent to the wire). */
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
        /** @var list<Field> */
        return $this->creatableFieldList;
    }
}
