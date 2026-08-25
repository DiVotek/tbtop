<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Richtext extends Field
{
    protected function kind(): string
    {
        return 'richtext';
    }

    /** Placeholder text shown in the empty editor. */
    public function placeholder(string $text): static
    {
        return $this->set('placeholder', $text);
    }
}
