<?php

namespace Tbtop\Admin\Dsl\Concerns;

use InvalidArgumentException;

/**
 * The `inputmode` keyboard hint shared by Text and Number. Opt-in only: no
 * field sets a mode on its own, and none is inferred from rules or masks.
 */
trait HasInputMode
{
    /**
     * Virtual keyboard hint for touch devices, rendered as the input's
     * `inputmode` attribute: none, text, decimal, numeric, tel, search,
     * email or url. It only picks the keyboard; it does not validate the
     * value — pair it with rules such as rules(['numeric']).
     *
     * @throws InvalidArgumentException when the mode is not one of the above
     */
    public function inputMode(string $mode): static
    {
        $modes = ['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'];

        if (! in_array($mode, $modes, true)) {
            throw new InvalidArgumentException(sprintf(
                '%s::inputMode() expects one of %s, got "%s".',
                class_basename(static::class),
                implode(', ', $modes),
                $mode,
            ));
        }

        return $this->set('inputMode', $mode);
    }
}
