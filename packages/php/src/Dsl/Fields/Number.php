<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Number extends Field
{
    protected function kind(): string
    {
        return 'number';
    }
}
