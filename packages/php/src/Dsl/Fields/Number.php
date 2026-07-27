<?php

namespace Tbtop\Admin\Dsl\Fields;

use InvalidArgumentException;
use Tbtop\Admin\Dsl\Concerns\HasNumericRules;

final class Number extends Field
{
    use HasNumericRules;

    protected function kind(): string
    {
        return 'number';
    }

    public function placeholder(string $text): static
    {
        return $this->set('placeholder', $text);
    }

    /** Granularity of each increment (structural — drives the input's step attribute). Pass 'any' to allow arbitrary precision. */
    public function step(int|float|string $step): static
    {
        if (is_string($step) && $step !== 'any') {
            throw new InvalidArgumentException('Number::step() only accepts a number or the string "any".');
        }

        return $this->set('step', $step);
    }
}
