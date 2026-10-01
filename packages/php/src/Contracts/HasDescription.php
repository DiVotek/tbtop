<?php

namespace Tbtop\Admin\Contracts;

use Illuminate\Contracts\Support\Htmlable;

/**
 * An enum case's helper text, emitted as the option 'description' by
 * options(Enum::class). Same signature as Filament 4's HasDescription; an
 * Htmlable ships as plain text.
 */
interface HasDescription
{
    public function getDescription(): string|Htmlable|null;
}
