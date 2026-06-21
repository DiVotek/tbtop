<?php

namespace Tbtop\Admin\Dsl\Concerns;

/**
 * Fluent string-validation helpers for text-like fields.
 *
 * Composed onto Text/Textarea/Password/Slug only — never the base Field,
 * so a boolean never exposes ->minLength(). min/max map to wire
 * constraints (on-blur UX); the rest are server-only by design.
 *
 * @method static rules(string|array $rules)
 */
trait HasStringRules
{
    /** Minimum character count. */
    public function minLength(int $length): static
    {
        return $this->rules('min:'.$length);
    }

    /** Maximum character count. */
    public function maxLength(int $length): static
    {
        return $this->rules('max:'.$length);
    }

    /** Exact character count. */
    public function length(int $length): static
    {
        return $this->rules('size:'.$length);
    }

    /**
     * Match a PCRE pattern. Passed as an array element so the rule
     * collector does not split on '|' inside the pattern.
     */
    public function regex(string $pattern): static
    {
        return $this->rules(['regex:'.$pattern]);
    }

    /** Letters only. */
    public function alpha(): static
    {
        return $this->rules('alpha');
    }

    /** Letters and numbers only. */
    public function alphaNum(): static
    {
        return $this->rules('alpha_num');
    }

    /** Letters, numbers, dashes and underscores only. */
    public function alphaDash(): static
    {
        return $this->rules('alpha_dash');
    }

    /** Value must start with one of the given substrings. */
    public function startsWith(string ...$values): static
    {
        return $this->rules('starts_with:'.implode(',', $values));
    }

    /** Value must end with one of the given substrings. */
    public function endsWith(string ...$values): static
    {
        return $this->rules('ends_with:'.implode(',', $values));
    }
}
