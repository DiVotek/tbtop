<?php

namespace Tbtop\Admin\Dsl\Fields;

/**
 * Media-library picker field.
 *
 * Wires as kind=media. Value: single id (string|int) or array of ids when
 * ->multiple(). Persistence is the developer's responsibility (like all fields).
 */
final class MediaPicker extends Field
{
    protected function kind(): string
    {
        return 'media';
    }

    /** Allow selecting more than one item. */
    public function multiple(bool $value = true): static
    {
        return $this->set('multiple', $value);
    }

    /**
     * Filter which MIME types are visible/uploadable in the picker.
     *
     * @param  list<string>  $mimes  e.g. ['image/*', 'application/pdf']
     */
    public function accept(array $mimes): static
    {
        return $this->set('accept', $mimes);
    }
}
