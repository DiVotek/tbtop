<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use Tbtop\Admin\Dsl\Concerns\HasStringRules;

final class Textarea extends Field
{
    use HasStringRules;

    protected const RESOLVABLE = [...parent::RESOLVABLE, 'placeholder'];

    protected function kind(): string
    {
        return 'textarea';
    }

    /** @param  string|(Closure(): string)  $text */
    public function placeholder(string|Closure $text): static
    {
        return $this->set('placeholder', $text);
    }
}
