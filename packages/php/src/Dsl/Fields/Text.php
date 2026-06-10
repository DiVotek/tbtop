<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Text extends Field
{
    protected function kind(): string
    {
        return 'text';
    }
}
