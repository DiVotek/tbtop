<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use InvalidArgumentException;
use Tbtop\Admin\Dsl\Concerns\HasNumericRules;

final class Number extends Field
{
    use HasNumericRules;

    protected const RESOLVABLE = [...parent::RESOLVABLE, 'placeholder', 'step'];

    protected function kind(): string
    {
        return 'number';
    }

    /** @param  string|(Closure(): string)  $text */
    public function placeholder(string|Closure $text): static
    {
        return $this->set('placeholder', $text);
    }

    /**
     * Granularity of each increment (structural — drives the input's step
     * attribute). Pass 'any' to allow arbitrary precision.
     *
     * @param  int|float|string|(Closure(): (int|float|string))  $step
     */
    public function step(int|float|string|Closure $step): static
    {
        if (is_string($step) && $step !== 'any') {
            throw new InvalidArgumentException('Number::step() only accepts a number or the string "any".');
        }

        return $this->set('step', $step);
    }
}
