<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use Tbtop\Admin\Dsl\Concerns\HasDatabaseRules;
use Tbtop\Admin\Dsl\Concerns\HasStringRules;

final class Text extends Field
{
    use HasDatabaseRules;
    use HasStringRules;

    protected const RESOLVABLE = [...parent::RESOLVABLE, 'placeholder', 'mask'];

    protected function kind(): string
    {
        return 'text';
    }

    /** @param  string|(Closure(): string)  $pattern */
    public function mask(string|Closure $pattern): static
    {
        return $this->set('mask', $pattern);
    }

    /** @param  string|(Closure(): string)  $text */
    public function placeholder(string|Closure $text): static
    {
        return $this->set('placeholder', $text);
    }
}
