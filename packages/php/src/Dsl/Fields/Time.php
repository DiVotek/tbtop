<?php

namespace Tbtop\Admin\Dsl\Fields;

use InvalidArgumentException;

final class Time extends Field
{
    protected function kind(): string
    {
        return 'time';
    }

    /** Minute interval shown by the picker. */
    public function step(int $minutes): static
    {
        if ($minutes < 1 || $minutes > 60) {
            throw new InvalidArgumentException('Time::step() must be between 1 and 60 minutes.');
        }

        return $this->set('step', $minutes);
    }
}
