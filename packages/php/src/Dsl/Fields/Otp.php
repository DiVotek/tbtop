<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Otp extends Field
{
    protected function kind(): string
    {
        return 'otp';
    }

    /**
     * Number of code slots. Drives the rendered slot count AND a
     * server "digits:N" rule, so the backend enforces the shape the UI shows.
     */
    public function length(int $digits = 6): static
    {
        $this->set('length', $digits);

        return $this->rules('digits:'.$digits);
    }

    /** Client-side accepted-character regex; defaults to digits-only. */
    public function pattern(string $regex): static
    {
        return $this->set('pattern', $regex);
    }
}
