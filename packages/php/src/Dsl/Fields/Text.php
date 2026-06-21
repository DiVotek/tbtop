<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasDatabaseRules;
use Tbtop\Admin\Dsl\Concerns\HasStringRules;

final class Text extends Field
{
    use HasDatabaseRules;
    use HasStringRules;

    protected function kind(): string
    {
        return 'text';
    }
}
