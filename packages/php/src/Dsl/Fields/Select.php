<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use Tbtop\Admin\Dsl\Concerns\HasDatabaseRules;
use Tbtop\Admin\Dsl\Concerns\HasMultiple;
use Tbtop\Admin\Dsl\Concerns\HasOptions;

final class Select extends Field
{
    use HasDatabaseRules;
    use HasMultiple;
    use HasOptions;

    /** Server-only closure for creating a new option on the fly. */
    private ?Closure $creatableUsing = null;

    /** @var list<Field> Fields for the create mini-form (used for server-side validation). */
    private array $creatableFieldList = [];

    protected function kind(): string
    {
        return 'select';
    }

    public function searchable(bool $value = true): static
    {
        return $this->set('searchable', $value);
    }

    /** Provide an Eloquent query for dynamic options. */
    public function query(callable $callback): static
    {
        return $this->set('query', $callback);
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
        $fieldNodes = array_map(
            fn (Field $f) => $f->toNode(),
            $fields,
        );
        $this->opts['create'] = ['fields' => $fieldNodes];

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
