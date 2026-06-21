<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasNumericRules;

final class Number extends Field
{
    use HasNumericRules;

    protected function kind(): string
    {
        return 'number';
    }
}
