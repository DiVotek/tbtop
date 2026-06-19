<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\WithMeta;

/**
 * Stat metric card — a scalar KPI tile with optional delta, icon, color, and sparkline.
 * Value may be a plain scalar or a Closure resolved server-side at page render.
 */
final class Stat implements JsonSerializable
{
    use WithMeta;

    private mixed $value = null;

    private ?string $description = null;

    /** @var array{text: string, direction: string}|null */
    private ?array $delta = null;

    private ?string $icon = null;

    private Color|string|null $color = null;

    /** @var list<int|float>|null */
    private ?array $sparkline = null;

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

    public function icon(string $lucideName): self
    {
        $this->icon = $lucideName;

        return $this;
    }

    public function color(Color|string $color): self
    {
        $this->color = $color;

        return $this;
    }

    /** @param  list<int|float>  $numbers */
    public function sparkline(array $numbers): self
    {
        $this->sparkline = $numbers;

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
        if ($this->icon !== null) {
            $options['icon'] = $this->icon;
        }
        if ($this->color !== null) {
            $options['color'] = $this->color instanceof Color
                ? $this->color->value
                : $this->color;
        }
        if ($this->sparkline !== null) {
            $options['sparkline'] = $this->sparkline;
        }

        return new Node('stat', $options, null, $this->metaBag);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
