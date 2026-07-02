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

    protected function kind(): string
    {
        return 'radio';
    }
}
