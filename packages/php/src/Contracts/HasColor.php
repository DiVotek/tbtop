<?php

namespace Tbtop\Admin\Contracts;

use Tbtop\Admin\Dsl\Color;

/**
 * An enum case's badge color. Same signature as Filament 4's HasColor; a null
 * color renders gray. The wire carries a color name only, so an array (a
 * Filament palette) throws InvalidArgumentException when the enum is expanded.
 */
interface HasColor
{
    /** @return Color|string|array<array-key, mixed>|null */
    public function getColor(): Color|string|array|null;
}
