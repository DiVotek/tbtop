<?php

namespace Tbtop\Admin\Dsl\Concerns;

/**
 * Fluent numeric-validation helpers for number-like fields.
 *
 * Named minValue/maxValue (Filament's names) to avoid clashing with
 * Slider's structural min()/max() that drive the track range.
 * min/max map to wire constraints; the rest are server-only.
 *
 * Range helpers pair with "numeric" so Laravel reads min/max/between as a
 * value range, not a string length (its default when no numeric rule exists).
 * The rule collector dedupes a repeated "numeric".
 *
 * @method static rules(string|array $rules)
 */
trait HasNumericRules
{
    /** Smallest accepted value. */
    public function minValue(int|float $value): static
    {
        return $this->rules('numeric|min:'.$value);
    }

    /** Largest accepted value. */
    public function maxValue(int|float $value): static
    {
        return $this->rules('numeric|max:'.$value);
    }

    /** Value must fall within the inclusive range. */
    public function between(int|float $min, int|float $max): static
    {
        return $this->rules('numeric|between:'.$min.','.$max);
    }

    /** Value must be a multiple of the given step. */
    public function multipleOf(int|float $value): static
    {
        return $this->rules('multiple_of:'.$value);
    }

    /** Value must be an integer. */
    public function integer(): static
    {
        return $this->rules('integer');
    }

    /** Value must be numeric. */
    public function numeric(): static
    {
        return $this->rules('numeric');
    }
}
