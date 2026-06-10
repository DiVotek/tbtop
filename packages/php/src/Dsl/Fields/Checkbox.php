<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Checkbox extends Field
{
    protected function kind(): string
    {
        return 'checkbox';
    }
}
