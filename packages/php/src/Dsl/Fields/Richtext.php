<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;

final class Richtext extends Field
{
    protected const RESOLVABLE = [...parent::RESOLVABLE, 'placeholder'];

    protected function kind(): string
    {
        return 'richtext';
    }

    /** @param  string|(Closure(): string)  $text */
    public function placeholder(string|Closure $text): static
    {
        return $this->set('placeholder', $text);
    }
}
