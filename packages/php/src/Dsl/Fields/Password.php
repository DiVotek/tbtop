<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasStringRules;

final class Password extends Field
{
    use HasStringRules;

    protected function kind(): string
    {
        return 'password';
    }
}
