<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Keyvalue extends Field
{
    protected function kind(): string
    {
        return 'keyvalue';
    }
}
