<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Slider extends Field
{
    protected function kind(): string
    {
        return 'slider';
    }

    /** Lowest selectable value (structural — drives the track range). */
    public function min(int|float $value): static
    {
        return $this->set('min', $value);
    }

    /** Highest selectable value (structural — drives the track range). */
    public function max(int|float $value): static
    {
        return $this->set('max', $value);
    }

    /** Granularity of each thumb move (structural — drives snapping). */
    public function step(int|float $value): static
    {
        return $this->set('step', $value);
    }
}
