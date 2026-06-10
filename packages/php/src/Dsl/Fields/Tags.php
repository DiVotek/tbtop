<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Tags extends Field
{
    protected function kind(): string
    {
        return 'tags';
    }
}
