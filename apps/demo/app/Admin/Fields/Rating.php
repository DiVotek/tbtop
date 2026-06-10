<?php

namespace App\Admin\Fields;

use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Custom star-rating field (kind: rating).
 * Demonstrates two-phase registration via S::register().
 */
final class Rating extends Field
{
    protected function kind(): string
    {
        return 'rating';
    }

    /** Maximum selectable stars / value. Serialized to options.max. */
    public function max(int $max): static
    {
        return $this->set('max', $max);
    }
}
