<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Slug extends Field
{
    protected function kind(): string
    {
        return 'slug';
    }

    /** Set the source field whose value is used to auto-generate the slug. */
    public function fromField(string $fieldName): static
    {
        return $this->set('fromField', $fieldName);
    }
}
