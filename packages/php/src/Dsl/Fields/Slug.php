<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasStringRules;

final class Slug extends Field
{
    use HasStringRules;

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
