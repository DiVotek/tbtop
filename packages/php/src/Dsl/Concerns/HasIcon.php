<?php

namespace Tbtop\Admin\Dsl\Concerns;

trait HasIcon
{
    /** @var array{name: string, position: string}|null */
    protected ?array $iconDef = null;

    private const ICON_POSITIONS = ['left', 'right'];

    /** @param  string  $position  One of self::ICON_POSITIONS ('left'|'right') */
    public function icon(string $name, string $position = 'left'): static
    {
        if (! in_array($position, self::ICON_POSITIONS, true)) {
            throw new \InvalidArgumentException(
                "Invalid icon position \"{$position}\". Allowed: ".implode(', ', self::ICON_POSITIONS).'.'
            );
        }

        $this->iconDef = ['name' => $name, 'position' => $position];

        return $this;
    }

    /** @return array<string, mixed> */
    protected function iconOption(): array
    {
        return $this->iconDef !== null ? ['icon' => $this->iconDef] : [];
    }
}
