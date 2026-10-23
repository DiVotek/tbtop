<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use Tbtop\Admin\Dsl\Concerns\HasNumericRules;

final class Slider extends Field
{
    use HasNumericRules;

    protected const RESOLVABLE = [...parent::RESOLVABLE, 'min', 'max', 'step'];

    protected function kind(): string
    {
        return 'slider';
    }

    /**
     * Lowest selectable value (structural — drives the track range).
     *
     * @param  int|float|(Closure(): (int|float))  $value
     */
    public function min(int|float|Closure $value): static
    {
        return $this->set('min', $value);
    }

    /**
     * Highest selectable value (structural — drives the track range).
     *
     * @param  int|float|(Closure(): (int|float))  $value
     */
    public function max(int|float|Closure $value): static
    {
        return $this->set('max', $value);
    }

    /**
     * Granularity of each thumb move (structural — drives snapping).
     *
     * @param  int|float|(Closure(): (int|float))  $value
     */
    public function step(int|float|Closure $value): static
    {
        return $this->set('step', $value);
    }
}
