<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasIcon;
use Tbtop\Admin\Dsl\Concerns\HasTooltip;
use Tbtop\Admin\Dsl\Concerns\WithMeta;

/**
 * Stat metric card — a scalar KPI tile with optional delta, icon, color, and sparkline.
 * Value may be a plain scalar or a Closure resolved server-side at page render (and,
 * with ->poll(), re-resolved on each data-endpoint request).
 */
final class Stat implements JsonSerializable
{
    use HasIcon;
    use HasTooltip;
    use WithMeta;

    private const SPARKLINE_POSITIONS = ['inline', 'bottom'];

    private const SEMANTIC_COLORS = ['success', 'warning', 'danger'];

    private const MIN_POLL_SECONDS = 5;

    private mixed $value = null;

    private ?string $description = null;

    private ?string $descriptionColor = null;

    /** @var 'up'|'down'|null */
    private ?string $trend = null;

    /** @var array{text: string, direction: string}|null */
    private ?array $delta = null;

    private Color|string|null $color = null;

    private ?string $sparklineColor = null;

    /** @var list<int|float>|null */
    private ?array $sparkline = null;

    private string $sparklinePosition = 'inline';

    private ?int $pollSeconds = null;

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

    /**
     * @param  string|null  $color  One of self::SEMANTIC_COLORS ('success'|'warning'|'danger'),
     *                              or null (default) for the current muted text.
     */
    public function description(?string $description, ?string $color = null): self
    {
        $this->description = $description;
        if ($color !== null) {
            $this->descriptionColor = self::normalizeSemanticColor($color);
        }

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

    /** Small trend arrow rendered after the description, inheriting its color. */
    public function trend(string $direction): self
    {
        if (! in_array($direction, ['up', 'down'], true)) {
            throw new InvalidArgumentException(
                "Invalid trend direction \"{$direction}\". Allowed: up, down."
            );
        }
        $this->trend = $direction;

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
            throw new InvalidArgumentException(
                'Invalid sparkline position "'.$position.'". Allowed: '.implode(', ', self::SPARKLINE_POSITIONS).'.'
            );
        }
        $this->sparkline = $numbers;
        $this->sparklinePosition = $position;

        return $this;
    }

    /** @param  string  $color  One of success|warning|danger|primary. Default: current chart color. */
    public function sparklineColor(string $color): self
    {
        $allowed = [...self::SEMANTIC_COLORS, 'primary'];
        if (! in_array($color, $allowed, true)) {
            throw new InvalidArgumentException(
                "Invalid sparkline color \"{$color}\". Allowed: ".implode(', ', $allowed).'.'
            );
        }
        $this->sparklineColor = $color;

        return $this;
    }

    /**
     * Poll the stat's data endpoint every $seconds (client-clamped to a 5s
     * minimum). The value closure is re-invoked on every poll tick instead of
     * once at page render. Stamps options.source so the client knows to fetch
     * from the page data endpoint, keyed by this stat's label.
     */
    public function poll(int $seconds): self
    {
        if ($seconds < self::MIN_POLL_SECONDS) {
            throw new InvalidArgumentException(
                'Stat poll interval must be at least '.self::MIN_POLL_SECONDS.' seconds.'
            );
        }
        $this->pollSeconds = $seconds;

        return $this;
    }

    /**
     * Data-endpoint resolver for polling: re-invokes the value closure and
     * returns the refreshed descriptor. Null when poll() was never called —
     * DataController falls through to "not found" in that case.
     *
     * @return null|Closure(): array{value: mixed, description?: string, sparkline?: list<int|float>}
     */
    public function queryClosure(): ?Closure
    {
        if ($this->pollSeconds === null) {
            return null;
        }

        return function (): array {
            $resolved = $this->value instanceof Closure ? ($this->value)() : $this->value;
            $out = ['value' => $resolved];
            if ($this->description !== null) {
                $out['description'] = $this->description;
            }
            if ($this->sparkline !== null) {
                $out['sparkline'] = $this->sparkline;
            }

            return $out;
        };
    }

    public function toNode(): Node
    {
        $resolved = $this->value instanceof Closure ? ($this->value)() : $this->value;

        $options = ['label' => $this->label, 'value' => $resolved];

        if ($this->description !== null) {
            $options['description'] = $this->description;
        }
        if ($this->descriptionColor !== null) {
            $options['descriptionColor'] = $this->descriptionColor;
        }
        if ($this->trend !== null) {
            $options['trend'] = $this->trend;
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
        if ($this->sparklineColor !== null) {
            $options['sparklineColor'] = $this->sparklineColor;
        }
        if ($this->pollSeconds !== null) {
            $options['poll'] = $this->pollSeconds;
            $options['source'] = $this->label;
        }

        return new Node('stat', [...$options, ...$this->iconOption(), ...$this->tooltipOption()], null, $this->metaBag);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }

    private static function normalizeSemanticColor(string $color): string
    {
        if (! in_array($color, self::SEMANTIC_COLORS, true)) {
            throw new InvalidArgumentException(
                "Invalid description color \"{$color}\". Allowed: ".implode(', ', self::SEMANTIC_COLORS).'.'
            );
        }

        return $color;
    }
}
