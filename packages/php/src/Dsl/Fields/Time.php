<?php

namespace Tbtop\Admin\Dsl\Fields;

use InvalidArgumentException;

final class Time extends Field
{
    protected function kind(): string
    {
        return 'time';
    }

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

    public function seconds(): static
    {
        if (isset($this->opts['minuteStep'])) {
            throw new InvalidArgumentException('Time::seconds() cannot be combined with Time::minuteStep().');
        }

        return $this->set('seconds', true);
    }

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
