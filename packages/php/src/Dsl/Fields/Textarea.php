<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasLocalePlaceholder;
use Tbtop\Admin\Dsl\Concerns\HasStringRules;

final class Textarea extends Field
{
    use HasLocalePlaceholder;
    use HasStringRules;

    protected function kind(): string
    {
        return 'textarea';
    }
}
