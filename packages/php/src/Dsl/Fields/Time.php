<?php

namespace Tbtop\Admin\Dsl\Fields;

use InvalidArgumentException;

final class Time extends Field
{
    protected function kind(): string
    {
        return 'time';
    }

    /** Minute picker granularity, 1-60. Mutually exclusive with seconds() — combining them throws. */
    public function minuteStep(int $minutes): static
    {
        if ($minutes < 1 || $minutes > 60) {
            throw new InvalidArgumentException('Time::minuteStep() must be between 1 and 60 minutes.');
        }

        if (($this->opts['seconds'] ?? false) === true) {
            throw new InvalidArgumentException('Time::minuteStep() cannot be combined with Time::seconds().');
        }

        return $this->set('minuteStep', $minutes);
    }

    /** Show a seconds picker alongside hours/minutes. Mutually exclusive with minuteStep() — combining them throws. Call before secondStep(). */
    public function seconds(): static
    {
        if (isset($this->opts['minuteStep'])) {
            throw new InvalidArgumentException('Time::seconds() cannot be combined with Time::minuteStep().');
        }

        return $this->set('seconds', true);
    }

    /** Second picker granularity, 1-59. Only meaningful after seconds() — calling it first throws. */
    public function secondStep(int $seconds): static
    {
        if (($this->opts['seconds'] ?? false) !== true) {
            throw new InvalidArgumentException('Call Time::seconds() before Time::secondStep().');
        }

        if ($seconds < 1 || $seconds > 59) {
            throw new InvalidArgumentException('Time::secondStep() must be between 1 and 59 seconds.');
        }

        return $this->set('secondStep', $seconds);
    }
}
