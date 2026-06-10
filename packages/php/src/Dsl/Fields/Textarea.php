<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Textarea extends Field
{
    protected function kind(): string
    {
        return 'textarea';
    }
}
