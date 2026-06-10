<?php

namespace Tbtop\Admin\Dsl\Fields;

/** Date-range field: value shape {from?: string, to?: string}. Wire kind "daterange". */
final class Daterange extends Field
{
    protected function kind(): string
    {
        return 'daterange';
    }
}
