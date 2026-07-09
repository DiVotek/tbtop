<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasIcon;
use Tbtop\Admin\Dsl\Concerns\HasTooltip;
use Tbtop\Admin\Dsl\Concerns\WithMeta;

/**
 * Stat metric card — a scalar KPI tile with optional delta, icon, color, and sparkline.
 * Value may be a plain scalar or a Closure resolved server-side at page render.
 */
final class Stat implements JsonSerializable
{
    use HasIcon;
    use HasTooltip;
    use WithMeta;

    private const SPARKLINE_POSITIONS = ['inline', 'bottom'];

    private mixed $value = null;

    private ?string $description = null;

    /** @var array{text: string, direction: string}|null */
    private ?array $delta = null;

    private Color|string|null $color = null;

    /** @var list<int|float>|null */
    private ?array $sparkline = null;

    private string $sparklinePosition = 'inline';

    public function __construct(
        private readonly string $label,
    ) {}

    public static function make(string $label): self
    {
        return new self($label);
    }

    public function value(mixed $value): self
    {
        $this->value = $value;

        return $this;
    }

    public function description(?string $description): self
    {
        $this->description = $description;

        return $this;
    }

    /**
     * @param  'up'|'down'|'flat'  $direction
     */
    public function delta(string $text, string $direction): self
    {
        $this->delta = ['text' => $text, 'direction' => $direction];

        return $this;
    }

    public function color(Color|string $color): self
    {
        $this->color = $color;

        return $this;
    }

    /**
     * @param  list<int|float>  $numbers
     * @param  string  $position  One of self::SPARKLINE_POSITIONS ('inline'|'bottom').
     *                            'inline' (default, back-compat) renders under the card
     *                            content; 'bottom' pins it full-bleed to the card's bottom edge.
     */
    public function sparkline(array $numbers, string $position = 'inline'): self
    {
        if (! in_array($position, self::SPARKLINE_POSITIONS, true)) {
            throw new \InvalidArgumentException(
                'Invalid sparkline position "'.$position.'". Allowed: '.implode(', ', self::SPARKLINE_POSITIONS).'.'
            );
        }
        $this->sparkline = $numbers;
        $this->sparklinePosition = $position;

        return $this;
    }

    public function toNode(): Node
    {
        $resolved = $this->value instanceof Closure ? ($this->value)() : $this->value;

        $options = ['label' => $this->label, 'value' => $resolved];

        if ($this->description !== null) {
            $options['description'] = $this->description;
        }
        if ($this->delta !== null) {
            $options['delta'] = $this->delta;
        }
        if ($this->color !== null) {
            $options['color'] = $this->color instanceof Color
                ? $this->color->value
                : $this->color;
        }
        if ($this->sparkline !== null) {
            $options['sparkline'] = $this->sparkline;
            if ($this->sparklinePosition !== 'inline') {
                $options['sparklinePosition'] = $this->sparklinePosition;
            }
        }

        return new Node('stat', [...$options, ...$this->iconOption(), ...$this->tooltipOption()], null, $this->metaBag);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
