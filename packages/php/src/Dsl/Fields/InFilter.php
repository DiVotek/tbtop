<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasOptions;

/**
 * Filter-only field: multi-value fixed-option list applied as WHERE IN.
 * Not intended for form editing — use in table()->filters() only.
 */
final class InFilter extends Field
{
    use HasOptions;

    protected function kind(): string
    {
        return 'in';
    }
}
