<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use InvalidArgumentException;
use Tbtop\Admin\Dsl\Concerns\HasAffixes;
use Tbtop\Admin\Dsl\Concerns\HasInputMode;
use Tbtop\Admin\Dsl\Concerns\HasNumericRules;

final class Number extends Field
{
    use HasAffixes;
    use HasInputMode;
    use HasNumericRules;

    protected const RESOLVABLE = [...parent::RESOLVABLE, 'placeholder', 'step'];

    protected function kind(): string
    {
        return 'number';
    }

    /**
     * Placeholder text shown in the empty input.
     *
     * @param  string|(Closure(): string)  $text
     */
    public function placeholder(string|Closure $text): static
    {
        return $this->set('placeholder', self::typedDeferral($text, 'string', 'Number::placeholder'));
    }

    /**
     * Granularity of each increment (structural — drives the input's step
     * attribute). A numeric string ('0.01') ships as a number; pass 'any'
     * to allow arbitrary precision. A Closure's result is checked when it
     * resolves.
     *
     * @param  int|float|string|(Closure(): (int|float|string))  $step
     */
    public function step(int|float|string|Closure $step): static
    {
        if ($step instanceof Closure) {
            return $this->set('step', fn () => self::checkedStep($step()));
        }

        return $this->set('step', self::checkedStep($step));
    }

    private static function checkedStep(mixed $step): int|float|string
    {
        if (is_int($step) || is_float($step) || $step === 'any') {
            return $step;
        }
        if (is_string($step) && is_numeric($step)) {
            return $step + 0;
        }

        throw new InvalidArgumentException('Number::step() only accepts a number, a numeric string or "any".');
    }
}
