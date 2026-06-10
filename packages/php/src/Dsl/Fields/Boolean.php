<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Boolean extends Field
{
    protected function kind(): string
    {
        return 'boolean';
    }
}
