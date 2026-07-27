<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;

trait HasIcon
{
    use ResolvesClosures;

    /** @var array{name: string|Closure, position: string|Closure}|null */
    protected ?array $iconDef = null;

    private const ICON_POSITIONS = ['left', 'right'];

    /**
     * @param  string|(Closure(): string)  $name
     * @param  string|(Closure(): string)  $position  One of self::ICON_POSITIONS ('left'|'right')
     */
    public function icon(string|Closure $name, string|Closure $position = 'left'): static
    {
        if (! $position instanceof Closure) {
            $this->assertValidPosition($position);
        }

        $this->iconDef = ['name' => $name, 'position' => $position];

        return $this;
    }

    /** @return array<string, mixed> */
    protected function iconOption(): array
    {
        if ($this->iconDef === null) {
            return [];
        }

        $position = $this->resolveOpt($this->iconDef['position']);
        $this->assertValidPosition($position);

        return ['icon' => [
            'name' => $this->resolveOpt($this->iconDef['name']),
            'position' => $position,
        ]];
    }

    private function assertValidPosition(string $position): void
    {
        if (! in_array($position, self::ICON_POSITIONS, true)) {
            throw new \InvalidArgumentException(
                "Invalid icon position \"{$position}\". Allowed: ".implode(', ', self::ICON_POSITIONS).'.'
            );
        }
    }
}
