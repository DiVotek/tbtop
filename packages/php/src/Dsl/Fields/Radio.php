<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasOptions;

final class Radio extends Field
{
    use HasOptions;

    /** Horizontal layout instead of the default stacked list. */
    public function inline(bool $value = true): static
    {
        return $this->set('inline', $value);
    }

    /**
     * Shorthand for a 2-option Yes/No radio. No-op if ->options() was
     * already called.
     */
    public function boolean(): static
    {
        if (isset($this->opts['options'])) {
            return $this;
        }

        return $this->options([
            ['value' => '1', 'label' => 'Yes'],
            ['value' => '0', 'label' => 'No'],
        ]);
    }

    /**
     * Shorthand for a 3-option Any/Yes/No radio, the three-state filter on a
     * boolean column: "Any" has an empty value, so it never narrows the query
     * and is selected when no value is set. Yes/No submit "1"/"0". No-op if
     * ->options() was already called.
     */
    public function ternary(string $any = 'Any', string $yes = 'Yes', string $no = 'No'): static
    {
        if (isset($this->opts['options'])) {
            return $this;
        }

        return $this->options([
            ['value' => '', 'label' => $any],
            ['value' => '1', 'label' => $yes],
            ['value' => '0', 'label' => $no],
        ]);
    }

    protected function kind(): string
    {
        return 'radio';
    }
}
