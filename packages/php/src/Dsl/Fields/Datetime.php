<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Datetime extends Field
{
    protected function kind(): string
    {
        return 'datetime';
    }
}
