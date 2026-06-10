<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Password extends Field
{
    protected function kind(): string
    {
        return 'password';
    }
}
