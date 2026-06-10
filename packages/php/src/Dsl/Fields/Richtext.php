<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Richtext extends Field
{
    protected function kind(): string
    {
        return 'richtext';
    }

    public function placeholder(string $text): static
    {
        return $this->set('placeholder', $text);
    }
}
