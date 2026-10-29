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
     * $name is a kebab-case Lucide icon name (e.g. 'circle-check') resolved
     * against the client's icon registry; register custom names client-side
     * via registerIcon before using them here. $position is 'left' (default)
     * or 'right', placing the icon relative to the label. Either may be a
     * Closure; a closure-supplied position is validated when it resolves.
     *
     * @param  string|(Closure(): string)  $name
     * @param  string|(Closure(): string)  $position
     */
    public function icon(string|Closure $name, string|Closure $position = 'left'): static
    {
        if (! $position instanceof Closure) {
            $this->assertValidIconPosition($position);
        }

        $this->iconDef = ['name' => self::typedDeferral($name, 'string', 'icon'), 'position' => $position];

        return $this;
    }

    /** @return array<string, mixed> */
    protected function iconOption(): array
    {
        if ($this->iconDef === null) {
            return [];
        }

        $position = $this->resolveOpt($this->iconDef['position']);
        $this->assertValidIconPosition($position);

        return ['icon' => [
            'name' => $this->resolveOpt($this->iconDef['name']),
            'position' => $position,
        ]];
    }

    private function assertValidIconPosition(mixed $position): void
    {
        if (! in_array($position, self::ICON_POSITIONS, true)) {
            $shown = is_scalar($position) ? (string) $position : get_debug_type($position);
            throw new \InvalidArgumentException(
                "Invalid icon position \"{$shown}\". Allowed: ".implode(', ', self::ICON_POSITIONS).'.'
            );
        }
    }
}
