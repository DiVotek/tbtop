<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasIcon;
use Tbtop\Admin\Dsl\Concerns\HasTooltip;
use Tbtop\Admin\Dsl\Concerns\ResolvesClosures;
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
    use ResolvesClosures;
    use WithMeta;

    private const SPARKLINE_POSITIONS = ['inline', 'bottom'];

    private const SEMANTIC_COLORS = ['success', 'warning', 'danger'];

    private const MIN_POLL_SECONDS = 5;

    private mixed $value = null;

    private string|Closure|null $description = null;

    private string|Closure|null $descriptionColor = null;

    private string|Closure|null $trend = null;

    /** @var array{text: string|Closure, direction: string|Closure}|null */
    private ?array $delta = null;

    private Color|string|Closure|null $color = null;

    private string|Closure|null $sparklineColor = null;

    /** @var list<int|float>|null */
    private ?array $sparkline = null;

    private string $sparklinePosition = 'inline';

    private int|Closure|null $pollSeconds = null;

    public function __construct(
        private readonly string $label,
    ) {}

    public static function make(string $label): self
    {
        return new self($label);
    }

    /** @param  mixed|(Closure(): mixed)  $value */
    public function value(mixed $value): self
    {
        $this->value = $value;

        return $this;
    }

    /**
     * @param  string|(Closure(): string)|null  $description
     * @param  string|(Closure(): string)|null  $color  One of self::SEMANTIC_COLORS ('success'|'warning'|'danger'),
     *                                                  or null (default) for the current muted text.
     */
    public function description(string|Closure|null $description, string|Closure|null $color = null): self
    {
        $this->description = $description;
        if ($color !== null) {
            $this->descriptionColor = $color instanceof Closure ? $color : self::normalizeSemanticColor($color);
        }

        return $this;
    }

    /**
     * @param  string|(Closure(): string)  $text
     * @param  'up'|'down'|'flat'|(Closure(): string)  $direction
     */
    public function delta(string|Closure $text, string|Closure $direction): self
    {
        $this->delta = ['text' => $text, 'direction' => $direction];

        return $this;
    }

    /** @param  Color|string|(Closure(): (Color|string))  $color */
    public function color(Color|string|Closure $color): self
    {
        $this->color = $color;

        return $this;
    }

    /**
     * Small trend arrow rendered after the description, inheriting its color.
     * A Closure is validated at resolution time (toNode()), not here.
     *
     * @param  string|(Closure(): string)  $direction
     */
    public function trend(string|Closure $direction): self
    {
        if (! $direction instanceof Closure) {
            self::assertValidTrend($direction);
        }
        $this->trend = $direction;

        return $this;
    }

    private static function assertValidTrend(string $direction): void
    {
        if (! in_array($direction, ['up', 'down'], true)) {
            throw new InvalidArgumentException(
                "Invalid trend direction \"{$direction}\". Allowed: up, down."
            );
        }
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

    /**
     * A Closure is validated at resolution time (toNode()), not here.
     *
     * @param  string|(Closure(): string)  $color  One of success|warning|danger|primary. Default: current chart color.
     */
    public function sparklineColor(string|Closure $color): self
    {
        if (! $color instanceof Closure) {
            self::assertValidSparklineColor($color);
        }
        $this->sparklineColor = $color;

        return $this;
    }

    private static function assertValidSparklineColor(string $color): void
    {
        $allowed = [...self::SEMANTIC_COLORS, 'primary'];
        if (! in_array($color, $allowed, true)) {
            throw new InvalidArgumentException(
                "Invalid sparkline color \"{$color}\". Allowed: ".implode(', ', $allowed).'.'
            );
        }
    }

    /**
     * Poll the stat's data endpoint every $seconds (client-clamped to a 5s
     * minimum). The value closure is re-invoked on every poll tick instead of
     * once at page render. Stamps options.source so the client knows to fetch
     * from the page data endpoint, keyed by this stat's label.
     *
     * @param  int|(Closure(): int)  $seconds
     */
    public function poll(int|Closure $seconds): self
    {
        if (! $seconds instanceof Closure) {
            self::assertValidPollSeconds($seconds);
        }
        $this->pollSeconds = $seconds;

        return $this;
    }

    private static function assertValidPollSeconds(int $seconds): void
    {
        if ($seconds < self::MIN_POLL_SECONDS) {
            throw new InvalidArgumentException(
                'Stat poll interval must be at least '.self::MIN_POLL_SECONDS.' seconds.'
            );
        }
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
            $out = ['value' => $this->resolveOpt($this->value)];
            if ($this->description !== null) {
                $out['description'] = $this->resolveOpt($this->description);
            }
            if ($this->sparkline !== null) {
                $out['sparkline'] = $this->sparkline;
            }

            return $out;
        };
    }

    public function toNode(): Node
    {
        $options = ['label' => $this->label, 'value' => $this->resolveOpt($this->value)];

        if ($this->description !== null) {
            $options['description'] = $this->resolveOpt($this->description);
        }
        if ($this->descriptionColor !== null) {
            $options['descriptionColor'] = $this->resolvedDescriptionColor();
        }
        if ($this->trend !== null) {
            $options['trend'] = $this->resolvedTrend();
        }
        if ($this->delta !== null) {
            $options['delta'] = [
                'text' => $this->resolveOpt($this->delta['text']),
                'direction' => $this->resolveOpt($this->delta['direction']),
            ];
        }
        if ($this->color !== null) {
            $color = $this->resolveOpt($this->color);
            $options['color'] = $color instanceof Color ? $color->value : $color;
        }
        if ($this->sparkline !== null) {
            $options['sparkline'] = $this->sparkline;
            if ($this->sparklinePosition !== 'inline') {
                $options['sparklinePosition'] = $this->sparklinePosition;
            }
        }
        if ($this->sparklineColor !== null) {
            $options['sparklineColor'] = $this->resolvedSparklineColor();
        }
        if ($this->pollSeconds !== null) {
            $options['poll'] = $this->resolvedPollSeconds();
            $options['source'] = $this->label;
        }

        return new Node('stat', [...$options, ...$this->iconOption(), ...$this->tooltipOption()], null, $this->resolvedMeta());
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }

    private function resolvedDescriptionColor(): string
    {
        return self::normalizeSemanticColor($this->resolveOpt($this->descriptionColor));
    }

    private function resolvedTrend(): string
    {
        $trend = $this->resolveOpt($this->trend);
        self::assertValidTrend($trend);

        return $trend;
    }

    private function resolvedSparklineColor(): string
    {
        $color = $this->resolveOpt($this->sparklineColor);
        self::assertValidSparklineColor($color);

        return $color;
    }

    private function resolvedPollSeconds(): int
    {
        $seconds = $this->resolveOpt($this->pollSeconds);
        self::assertValidPollSeconds($seconds);

        return $seconds;
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
