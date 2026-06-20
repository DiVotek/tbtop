<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasMultiple;
use Tbtop\Admin\Dsl\Concerns\HasOptions;

final class ToggleButtons extends Field
{
    use HasMultiple;
    use HasOptions;

    protected function kind(): string
    {
        return 'togglebuttons';
    }
}
