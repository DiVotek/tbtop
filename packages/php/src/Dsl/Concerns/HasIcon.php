<?php

namespace Tbtop\Admin\Dsl\Concerns;

trait HasIcon
{
    /** @var array{name: string, position: string}|null */
    protected ?array $iconDef = null;

    /** @param  'left'|'right'  $position */
    public function icon(string $name, string $position = 'left'): static
    {
        $this->iconDef = ['name' => $name, 'position' => $position];

        return $this;
    }

    /** @return array<string, mixed> */
    protected function iconOption(): array
    {
        return $this->iconDef !== null ? ['icon' => $this->iconDef] : [];
    }
}
