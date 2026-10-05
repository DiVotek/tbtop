<?php

namespace Tbtop\Admin\Contracts;

use Illuminate\Contracts\Support\Htmlable;

/**
 * An enum case's display text for badge() and options(). Same signature as
 * Filament 4's HasLabel, so a Filament enum ports by swapping the use line.
 * A null label falls back to the case name; an Htmlable ships as plain text.
 */
interface HasLabel
{
    public function getLabel(): string|Htmlable|null;
}
