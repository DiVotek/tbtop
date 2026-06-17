<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Otp extends Field
{
    protected function kind(): string
    {
        return 'otp';
    }

    /** Number of code slots (default 6 on the client). */
    public function length(int $digits = 6): static
    {
        return $this->set('length', $digits);
    }

    /** Client-side accepted-character regex; defaults to digits-only. */
    public function pattern(string $regex): static
    {
        return $this->set('pattern', $regex);
    }
}
