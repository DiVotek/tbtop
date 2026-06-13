<?php

namespace Tbtop\Admin\Dsl\Fields;

/**
 * Filter-only field: multi-value fixed-option list applied as WHERE IN.
 * Not intended for form editing — use in table()->filters() only.
 */
final class InFilter extends Field
{
    protected function kind(): string
    {
        return 'in';
    }

    /** @param  list<array{value: mixed, label: string}>  $options */
    public function options(array $options): static
    {
        return $this->set('options', self::normalizeOptionValues($options));
    }
}
