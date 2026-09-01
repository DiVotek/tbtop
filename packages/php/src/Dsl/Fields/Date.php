<?php

namespace Tbtop\Admin\Dsl\Fields;

use DateTimeInterface;
use InvalidArgumentException;

final class Date extends Field
{
    protected function kind(): string
    {
        return 'date';
    }

    /**
     * Swaps the calendar caption's year label for a year dropdown. Offers only
     * years within minDate()/maxDate() — without them, a narrow band around today.
     */
    public function yearPicker(bool $state = true): static
    {
        return $this->set('yearPicker', $state);
    }

    /** Earliest selectable day; also the first year offered by yearPicker(). */
    public function minDate(DateTimeInterface|string $date): static
    {
        return $this->set('minDate', $this->normalizeDay($date, 'minDate'));
    }

    /** Latest selectable day; also the last year offered by yearPicker(). */
    public function maxDate(DateTimeInterface|string $date): static
    {
        return $this->set('maxDate', $this->normalizeDay($date, 'maxDate'));
    }

    private function normalizeDay(DateTimeInterface|string $date, string $method): string
    {
        if ($date instanceof DateTimeInterface) {
            return $date->format('Y-m-d');
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
            throw new InvalidArgumentException(
                "Date::{$method}() expects a Y-m-d string or a DateTimeInterface, got \"{$date}\".",
            );
        }

        return $date;
    }
}
