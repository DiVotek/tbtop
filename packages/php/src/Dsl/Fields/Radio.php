<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasOptions;

final class Radio extends Field
{
    use HasOptions;

    protected function kind(): string
    {
        return 'radio';
    }
}
