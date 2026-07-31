<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;

/**
 * Media-library picker field.
 *
 * Wires as kind=media. Value: single id (string|int) or array of ids when
 * ->multiple(). Persistence is the developer's responsibility (like all fields).
 */
final class MediaPicker extends Field
{
    protected const RESOLVABLE = [...parent::RESOLVABLE, 'variant'];

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

    /**
     * Visual variant of the picker. Applies to single-select only —
     * ->multiple() always renders preview chips regardless of variant.
     *
     * @param  'inline'|'preview'|(Closure(): ('inline'|'preview'))  $variant  'inline' (default) — Choose button plus a
     *                                                                         read-only filename display; 'preview' — a
     *                                                                         clickable large-preview block.
     */
    public function variant(string|Closure $variant): static
    {
        return $this->set('variant', $variant);
    }
}
