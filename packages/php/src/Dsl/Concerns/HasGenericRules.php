<?php

namespace Tbtop\Admin\Dsl\Concerns;

/**
 * Cross-field fluent validation helpers safe for any field kind.
 *
 * Each method appends a Laravel rule via the adopter's rules() collector;
 * no new machinery. Lives on the base Field so every field inherits it.
 *
 * @method static rules(string|array $rules)
 */
trait HasGenericRules
{
    /** Value may be null/empty (skips other rules when absent). */
    public function nullable(): static
    {
        return $this->rules('nullable');
    }

    /** Value must equal another field's value (e.g. password match). */
    public function same(string $field): static
    {
        return $this->rules('same:'.$field);
    }

    /** Value must differ from another field's value. */
    public function different(string $field): static
    {
        return $this->rules('different:'.$field);
    }

    /** Requires a sibling "{name}_confirmation" field to match. */
    public function confirmed(): static
    {
        return $this->rules('confirmed');
    }

    /** Required only when all listed fields are present. */
    public function requiredWith(string ...$fields): static
    {
        return $this->rules('required_with:'.implode(',', $fields));
    }

    /** Required only when any listed field is absent. */
    public function requiredWithout(string ...$fields): static
    {
        return $this->rules('required_without:'.implode(',', $fields));
    }

    /**
     * Value must be one of the allowed set.
     *
     * @param  list<string|int>  $values
     */
    public function in(array $values): static
    {
        return $this->rules('in:'.implode(',', $values));
    }

    /**
     * Value must NOT be one of the listed set.
     *
     * @param  list<string|int>  $values
     */
    public function notIn(array $values): static
    {
        return $this->rules('not_in:'.implode(',', $values));
    }
}
