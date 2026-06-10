<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Date extends Field
{
    protected function kind(): string
    {
        return 'date';
    }
}
